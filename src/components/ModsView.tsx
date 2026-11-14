import React, { useState } from 'react';
import {
  CheckCheck,
  Download,
  Package,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { filterMods, parseAmethystModJson, validateModImport } from '../core/launcherLogic';
import {
  AndroidAbi,
  LauncherState,
  ModEntry,
  RuntimeType,
} from '../core/types';
import { scanAmethystArchive } from '../core/zipBuilder';

interface ModsViewProps {
  state: LauncherState;
  onToggleMod: (modId: string) => void;
  onSetProfileMods: (modIds: string[]) => void;
  onImportMod: (mod: ModEntry) => void;
  onDeleteMod: (modId: string) => void;
  onToggleRuntimeInstalled: (runtimeId: string) => void;
  importModalOpen: boolean;
  onSetImportModalOpen: (open: boolean) => void;
}

type ModCategoryFilter = 'all' | 'active' | 'bonus' | 'imported';

export const ModsView: React.FC<ModsViewProps> = ({
  state,
  onToggleMod,
  onSetProfileMods,
  onImportMod,
  onDeleteMod,
  onToggleRuntimeInstalled,
  importModalOpen,
  onSetImportModalOpen,
}) => {
  const [subTab, setSubTab] = useState<'mods' | 'runtimes'>('mods');
  const [categoryFilter, setCategoryFilter] = useState<ModCategoryFilter>('all');
  const [query, setQuery] = useState('');
  const [abiFilter, setAbiFilter] = useState<AndroidAbi | 'all'>('all');

  const [modName, setModName] = useState('');
  const [modVersion, setModVersion] = useState('1.0.0');
  const [modAuthor, setModAuthor] = useState('');
  const [modLibraryFile, setModLibraryFile] = useState('');
  const [modAbi, setModAbi] = useState<AndroidAbi>(state.config.targetAbi);
  const [modTargetMc, setModTargetMc] = useState('1.21.0.3');
  const [modDescription, setModDescription] = useState('');
  const [modSizeKb, setModSizeKb] = useState<number>(220);
  const [scanSummary, setScanSummary] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const activeProfile = state.profiles.find((p) => p.id === state.activeProfileId);
  const activeRuntime = state.runtimes.find((r) => r.id === activeProfile?.runtimeId);
  const isVanillaActive = activeRuntime?.type === RuntimeType.VANILLA;

  const baseFiltered = filterMods(state.mods, query, abiFilter);
  const visibleMods = baseFiltered.filter((mod) => {
    if (categoryFilter === 'active') return Boolean(activeProfile?.modIds.includes(mod.id));
    if (categoryFilter === 'bonus') return Boolean(mod.isBonus);
    if (categoryFilter === 'imported') return Boolean(mod.isUserImported);
    return true;
  });

  const compatibleModIds = state.mods
    .filter((m) => m.abi === state.config.targetAbi)
    .map((m) => m.id);

  const processUploadedFile = async (file: File) => {
    setScanSummary(null);
    setImportErrors([]);
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    setModSizeKb(sizeKb);

    if (file.name.endsWith('.json')) {
      try {
        const text = await file.text();
        const parsed = parseAmethystModJson(text);
        if (!parsed) {
          setImportErrors(['El archivo mod.json no tiene un formato JSON válido.']);
          return;
        }
        if (parsed.name) setModName(parsed.name);
        if (parsed.version) setModVersion(parsed.version);
        if (parsed.author) setModAuthor(parsed.author);
        if (parsed.description) setModDescription(parsed.description);
        if (parsed.targetMcVersion) setModTargetMc(parsed.targetMcVersion);
        if (parsed.libraryFile) {
          setModLibraryFile(parsed.libraryFile);
        } else if (parsed.name) {
          setModLibraryFile(`lib${parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.so`);
        }
        setScanSummary('Metadatos leídos desde mod.json.');
      } catch {
        setImportErrors(['El archivo mod.json no tiene un formato JSON válido.']);
      }
      return;
    }

    if (file.name.endsWith('.so')) {
      const baseName = file.name.replace(/\.so$/i, '').replace(/^lib/, '');
      setModName(baseName.replace(/[_-]+/g, ' '));
      setModLibraryFile(file.name);
      setModAuthor('LocalImport');
      setModDescription('Librería nativa ELF (.so) importada para AmethystRuntime.');
      setScanSummary(`Librería ELF detectada (${sizeKb} KB).`);
      return;
    }

    if (file.name.endsWith('.amethyst') || file.name.endsWith('.zip')) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const scan = await scanAmethystArchive(bytes);
      const fallbackBase = file.name.replace(/\.(amethyst|zip)$/i, '').split('@')[0];

      const rawMeta = scan?.modJsonText || scan?.manifestJsonText;
      const parsed = rawMeta ? parseAmethystModJson(rawMeta) : null;

      const resolvedName = parsed?.name || fallbackBase.replace(/[_-]+/g, ' ');
      const slug = resolvedName.toLowerCase().replace(/[^a-z0-9]+/g, '_');

      setModName(resolvedName);
      if (parsed?.version) setModVersion(parsed.version);
      setModAuthor(parsed?.author || 'AmethystMod');
      if (parsed?.targetMcVersion) {
        const known = state.mcVersions.some((v) => v.version === parsed.targetMcVersion);
        if (known) setModTargetMc(parsed.targetMcVersion);
      }

      const detectedSo = scan?.soLibraries.find((p) => p.includes('arm64')) || scan?.soLibraries[0];
      const soFileName = detectedSo
        ? detectedSo.split('/').pop() || `lib${slug}.so`
        : parsed?.libraryFile || `lib${slug}.so`;

      setModLibraryFile(soFileName);

      if (scan?.hasPacks && !detectedSo) {
        setModDescription(
          parsed?.description ||
            `Paquete .amethyst con ${scan.entries.length} archivos (packs Bedrock + puente nativo Android).`
        );
      } else {
        setModDescription(
          parsed?.description || 'Mod .amethyst importado con soporte nativo Android.'
        );
      }

      if (scan) {
        setScanSummary(
          `Archivo analizado: ${scan.entries.length} entradas · ${scan.soLibraries.length} .so · ${scan.hasPacks ? 'packs Bedrock detectados' : 'sin packs'}`
        );
      } else {
        setScanSummary(`Archivo .amethyst preparado (${sizeKb} KB).`);
      }
      return;
    }

    setImportErrors(['Formato no compatible. Selecciona un archivo .amethyst, .so, .zip o mod.json.']);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleSubmitImport = (e: React.FormEvent) => {
    e.preventDefault();
    const { result, mod } = validateModImport(
      {
        name: modName,
        version: modVersion,
        author: modAuthor,
        description: modDescription,
        targetApiVersion: '1.3.1',
        targetMcVersion: modTargetMc,
        abi: modAbi,
        libraryFile: modLibraryFile,
        sizeKb: modSizeKb,
      },
      state.mods
    );

    if (!result.valid || !mod) {
      setImportErrors(result.errors);
      return;
    }

    onImportMod(mod);
    setModName('');
    setModVersion('1.0.0');
    setModAuthor('');
    setModLibraryFile('');
    setModDescription('');
    setScanSummary(null);
    setImportErrors([]);
    onSetImportModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Mods y Runtimes
          </h1>
          <p className="mt-1 text-sm text-[#9B8FB8]">
            Administra mods .amethyst y librerías ELF (.so) para el perfil{' '}
            <strong className="text-white">{activeProfile?.name ?? 'Ninguno'}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setImportErrors([]);
            setScanSummary(null);
            onSetImportModalOpen(true);
          }}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Importar Mod</span>
        </button>
      </div>

      {/* Sub-navigation & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Secciones de mods"
            className="inline-flex items-center p-1 rounded-xl bg-[#13111C] border border-white/[0.08]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'mods'}
              onClick={() => setSubTab('mods')}
              className={`min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                subTab === 'mods' ? 'bg-[#8B5CF6] text-white' : 'text-[#9B8FB8] hover:text-white'
              }`}
            >
              Mods · {state.mods.length}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'runtimes'}
              onClick={() => setSubTab('runtimes')}
              className={`min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                subTab === 'runtimes' ? 'bg-[#8B5CF6] text-white' : 'text-[#9B8FB8] hover:text-white'
              }`}
            >
              Runtimes · {state.runtimes.length}
            </button>
          </div>

          {subTab === 'mods' && !isVanillaActive && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSetProfileMods(compatibleModIds)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#EDE9F6] flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#A78BFA]" />
                <span>Activar compatibles</span>
              </button>
              <button
                type="button"
                onClick={() => onSetProfileMods([])}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-xs font-medium text-[#9B8FB8] hover:text-white transition-colors whitespace-nowrap"
              >
                Desactivar todos
              </button>
            </div>
          )}
        </div>

        {subTab === 'mods' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-xl">
            <div className="relative flex-1">
              <label htmlFor="mod-search" className="sr-only">
                Buscar mods
              </label>
              <Search className="w-4 h-4 text-[#9B8FB8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="mod-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar mod, autor o librería .so..."
                className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-[#13111C] border border-white/[0.08] text-sm text-white placeholder-[#6A6085] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <select
              aria-label="Filtrar por arquitectura ABI"
              value={abiFilter}
              onChange={(e) => setAbiFilter(e.target.value as AndroidAbi | 'all')}
              className="min-h-[44px] px-3.5 rounded-xl bg-[#13111C] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
            >
              <option value="all">Todas las ABI</option>
              <option value={AndroidAbi.ARM64_V8A}>arm64-v8a</option>
              <option value={AndroidAbi.ARMEABI_V7A}>armeabi-v7a</option>
            </select>
          </div>
        )}
      </div>

      {subTab === 'mods' && (
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'active', label: 'Activos en perfil' },
              { id: 'bonus', label: 'Mod Bonus' },
              { id: 'imported', label: 'Importados' },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setCategoryFilter(chip.id)}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                categoryFilter === chip.id
                  ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/50 text-[#EDE9F6]'
                  : 'bg-[#13111C] border-white/[0.08] text-[#9B8FB8] hover:text-white'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {isVanillaActive && subTab === 'mods' && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-xs md:text-sm text-amber-200">
          El perfil activo ({activeProfile?.name}) usa el runtime <strong>Vanilla</strong>. Cambia a un perfil con <strong>AmethystRuntime</strong> para inyectar mods al iniciar.
        </div>
      )}

      {/* List Content */}
      {subTab === 'mods' ? (
        visibleMods.length === 0 ? (
          <div className="rounded-2xl bg-[#13111C] border border-white/[0.08] p-10 text-center space-y-3">
            <p className="text-sm text-[#9B8FB8]">No se encontraron mods con los filtros actuales.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setAbiFilter('all');
                setCategoryFilter('all');
              }}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleMods
              .filter((mod) => mod.isBonus)
              .map((mod) => {
                const enabled = Boolean(activeProfile?.modIds.includes(mod.id));
                return (
                  <section
                    key={mod.id}
                    aria-label="Mod bonus incluido"
                    className="rounded-2xl bg-[#161324] border border-[#8B5CF6]/35 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Package className="w-4 h-4 text-[#A78BFA] shrink-0" />
                        <span className="px-2 py-0.5 rounded-md bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[11px] font-semibold uppercase tracking-wide text-[#C4B5FD]">
                          Mod Bonus · .amethyst + .so
                        </span>
                        <h2 className="text-base font-semibold text-white">{mod.name}</h2>
                        <span className="text-xs font-mono text-[#A78BFA] tabular-nums">
                          v{mod.version}
                        </span>
                      </div>
                      <p className="text-sm text-[#C4BBE0] leading-relaxed">{mod.description}</p>
                      <p className="text-xs text-[#9B8FB8] font-mono tabular-nums">
                        {mod.libraryFile} · {mod.abi} · MCBE {mod.targetMcVersion} · {mod.author} · {(mod.sizeKb / 1024).toFixed(1)} MB
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center shrink-0">
                      {mod.downloadUrl && (
                        <a
                          href={mod.downloadUrl}
                          download="Create@0.1.1.amethyst"
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white flex items-center gap-2 transition-colors whitespace-nowrap"
                        >
                          <Download className="w-4 h-4 text-[#A78BFA]" />
                          <span>Descargar .amethyst</span>
                        </a>
                      )}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={`Activar ${mod.name} en perfil activo`}
                        disabled={isVanillaActive}
                        onClick={() => onToggleMod(mod.id)}
                        className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                          enabled
                            ? 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED]'
                            : 'bg-white/[0.07] text-[#C4BBE0] hover:bg-white/[0.12]'
                        }`}
                      >
                        {enabled ? 'Activado' : 'Desactivado'}
                      </button>
                    </div>
                  </section>
                );
              })}

            {visibleMods.some((mod) => !mod.isBonus) && (
              <div className="rounded-2xl bg-[#13111C] border border-white/[0.08] divide-y divide-white/[0.06]">
                {visibleMods
                  .filter((mod) => !mod.isBonus)
                  .map((mod) => {
                    const enabled = Boolean(activeProfile?.modIds.includes(mod.id));
                    return (
                      <div
                        key={mod.id}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <h2 className="text-base font-semibold text-white">{mod.name}</h2>
                            <span className="text-xs font-mono text-[#A78BFA] tabular-nums">
                              v{mod.version}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-[#C4BBE0]">
                              {mod.sourceFormat ?? '.so'}
                            </span>
                            {enabled && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-[10px] font-semibold text-emerald-300">
                                Activo
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#9B8FB8] leading-relaxed">{mod.description}</p>
                          <p className="text-xs text-[#6A6085] font-mono tabular-nums">
                            {mod.libraryFile} · {mod.abi} · MCBE {mod.targetMcVersion} · {mod.author} · {mod.sizeKb} KB
                          </p>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          {mod.isUserImported && (
                            <button
                              type="button"
                              onClick={() => onDeleteMod(mod.id)}
                              aria-label={`Eliminar mod ${mod.name}`}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-rose-500/20 hover:text-rose-300 text-[#9B8FB8] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            aria-label={`Activar ${mod.name} en perfil activo`}
                            disabled={isVanillaActive}
                            onClick={() => onToggleMod(mod.id)}
                            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                              enabled
                                ? 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED]'
                                : 'bg-white/[0.07] text-[#C4BBE0] hover:bg-white/[0.12]'
                            }`}
                          >
                            {enabled ? 'Activado' : 'Desactivado'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="rounded-2xl bg-[#13111C] border border-white/[0.08] divide-y divide-white/[0.06]">
          {state.runtimes.map((rt) => (
            <div
              key={rt.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0 space-y-1">
                <h2 className="text-base font-semibold text-white">{rt.name}</h2>
                <p className="text-sm text-[#9B8FB8]">{rt.notes}</p>
                <p className="text-xs font-mono text-[#6A6085] tabular-nums">
                  {rt.libraryFile} · ABIs: {rt.abiSupport.join(', ')} · MCBE: {rt.targetMcVersions.join(', ')}
                </p>
              </div>
              <div className="shrink-0">
                {rt.type === RuntimeType.VANILLA ? (
                  <span className="text-xs font-medium text-emerald-400">Nativo del sistema</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleRuntimeInstalled(rt.id)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
                      rt.installed
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>{rt.installed ? 'Instalado' : 'Descargar Runtime'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Mod Modal */}
      {importModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-mod-title"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#13111C] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 id="import-mod-title" className="text-lg font-semibold text-white">
                Importar mod Android (.amethyst / .so / .zip)
              </h2>
              <button
                type="button"
                onClick={() => onSetImportModalOpen(false)}
                aria-label="Cerrar diálogo de importación"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#9B8FB8] hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitImport} className="mt-5 space-y-4">
              {importErrors.length > 0 && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-200 space-y-1"
                >
                  {importErrors.map((err) => (
                    <p key={err}>{err}</p>
                  ))}
                </div>
              )}

              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 cursor-pointer transition-colors text-center ${
                  isDragging
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                    : 'border-white/20 bg-[#0B0A10] hover:border-[#8B5CF6]'
                }`}
              >
                <Upload className="w-5 h-5 text-[#A78BFA]" />
                <span className="text-xs font-medium text-[#C4BBE0]">
                  Arrastra o selecciona un archivo .amethyst, .so, .zip o mod.json
                </span>
                {scanSummary && (
                  <span className="text-[11px] font-mono text-emerald-400">
                    {scanSummary}
                  </span>
                )}
                <input
                  type="file"
                  accept=".amethyst,.so,.zip,.json"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="mod-name-input" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
                    Nombre del mod
                  </label>
                  <input
                    id="mod-name-input"
                    type="text"
                    value={modName}
                    onChange={(e) => setModName(e.target.value)}
                    placeholder="Ej. Touch Controls Pro"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label htmlFor="mod-version-input" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
                    Versión (Semver)
                  </label>
                  <input
                    id="mod-version-input"
                    type="text"
                    value={modVersion}
                    onChange={(e) => setModVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm font-mono text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="mod-author-input" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
                    Autor
                  </label>
                  <input
                    id="mod-author-input"
                    type="text"
                    value={modAuthor}
                    onChange={(e) => setModAuthor(e.target.value)}
                    placeholder="Ej. FrederoxDev"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div>
                  <label htmlFor="mod-so-input" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
                    Librería ELF (.so)
                  </label>
                  <input
                    id="mod-so-input"
                    type="text"
                    value={modLibraryFile}
                    onChange={(e) => setModLibraryFile(e.target.value)}
                    placeholder="libtouch_controls.so"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm font-mono text-white focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="mod-abi-select" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
                    Arquitectura ABI
                  </label>
                  <select
                    id="mod-abi-select"
                    value={modAbi}
                    onChange={(e) => setModAbi(e.target.value as AndroidAbi)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value={AndroidAbi.ARM64_V8A}>arm64-v8a</option>
                    <option value={AndroidAbi.ARMEABI_V7A}>armeabi-v7a</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="mod-mc-select" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
                    MCBE objetivo
                  </label>
                  <select
                    id="mod-mc-select"
                    value={modTargetMc}
                    onChange={(e) => setModTargetMc(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    {state.mcVersions.map((ver) => (
                      <option key={ver.version} value={ver.version}>
                        {ver.version}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="mod-desc-input" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
                  Descripción (opcional)
                </label>
                <input
                  id="mod-desc-input"
                  type="text"
                  value={modDescription}
                  onChange={(e) => setModDescription(e.target.value)}
                  placeholder="Resumen funcional del mod nativo"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => onSetImportModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-sm font-medium text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-sm font-semibold text-white"
                >
                  Registrar Mod
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
