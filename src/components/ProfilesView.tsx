import React, { useState } from 'react';
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import {
  filterProfiles,
  validateProfileInput,
} from '../core/launcherLogic';
import {
  LauncherState,
  ProfileEntry,
  RuntimeType,
} from '../core/types';

interface ProfilesViewProps {
  state: LauncherState;
  onSelectProfile: (profileId: string) => void;
  onSaveProfile: (profile: ProfileEntry) => void;
  onDeleteProfile: (profileId: string) => void;
}

export const ProfilesView: React.FC<ProfilesViewProps> = ({
  state,
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
}) => {
  const [query, setQuery] = useState('');
  const [runtimeFilter, setRuntimeFilter] = useState<'all' | 'modded' | 'vanilla'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileEntry | null>(null);

  const [formName, setFormName] = useState('');
  const [formVersion, setFormVersion] = useState(state.mcVersions[0]?.version ?? '1.21.0.3');
  const [formRuntimeId, setFormRuntimeId] = useState(state.runtimes[1]?.id ?? 'amethyst-1.3.1');
  const [formModIds, setFormModIds] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const visibleProfiles = filterProfiles(state.profiles, state.runtimes, query, runtimeFilter);

  const openCreateModal = () => {
    setEditingProfile(null);
    setFormName('');
    setFormVersion(state.mcVersions[0]?.version ?? '1.21.0.3');
    setFormRuntimeId(state.runtimes.find((r) => r.type === RuntimeType.AMETHYST)?.id ?? 'vanilla');
    setFormModIds([]);
    setFormErrors([]);
    setModalOpen(true);
  };

  const openEditModal = (profile: ProfileEntry) => {
    setEditingProfile(profile);
    setFormName(profile.name);
    setFormVersion(profile.mcVersion);
    setFormRuntimeId(profile.runtimeId);
    setFormModIds(profile.modIds);
    setFormErrors([]);
    setModalOpen(true);
  };

  const handleToggleFormMod = (modId: string) => {
    setFormModIds((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateProfileInput({
      name: formName,
      mcVersion: formVersion,
      runtimeId: formRuntimeId,
      existingProfiles: state.profiles,
      editingId: editingProfile?.id,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    const selectedRuntime = state.runtimes.find((r) => r.id === formRuntimeId);
    const id =
      editingProfile?.id ??
      `profile-${formName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

    onSaveProfile({
      id,
      name: formName.trim(),
      mcVersion: formVersion,
      runtimeId: formRuntimeId,
      modIds: selectedRuntime?.type === RuntimeType.VANILLA ? [] : formModIds,
      lastPlayed: editingProfile?.lastPlayed ?? 'Sin iniciar aún',
    });
    setModalOpen(false);
  };

  const selectedFormRuntime = state.runtimes.find((r) => r.id === formRuntimeId);

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Perfiles de Android
          </h1>
          <p className="mt-1 text-sm text-[#9B8FB8]">
            Configura instancias de Minecraft Bedrock con su versión, runtime y conjunto de mods nativos (.so).
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Perfil</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <label htmlFor="profile-search" className="sr-only">
            Buscar perfiles
          </label>
          <Search className="w-4 h-4 text-[#9B8FB8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="profile-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o versión..."
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-[#13111C] border border-white/[0.08] text-sm text-white placeholder-[#6A6085] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>

        <div
          role="group"
          aria-label="Filtrar perfiles por runtime"
          className="inline-flex items-center p-1 rounded-xl bg-[#13111C] border border-white/[0.08]"
        >
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'modded', label: 'Modded' },
              { id: 'vanilla', label: 'Vanilla' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRuntimeFilter(tab.id)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                runtimeFilter === tab.id
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#9B8FB8] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Profiles Grid */}
      {visibleProfiles.length === 0 ? (
        <div className="rounded-2xl bg-[#13111C] border border-white/[0.08] p-10 text-center space-y-3">
          <p className="text-sm text-[#9B8FB8]">
            No hay perfiles que coincidan con tu búsqueda actual.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setRuntimeFilter('all');
            }}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-colors"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleProfiles.map((profile) => {
            const isActive = profile.id === state.activeProfileId;
            const runtime = state.runtimes.find((r) => r.id === profile.runtimeId);
            const isVanilla = runtime?.type === RuntimeType.VANILLA;

            return (
              <article
                key={profile.id}
                className={`rounded-2xl bg-[#13111C] border p-5 flex flex-col justify-between gap-5 transition-colors ${
                  isActive ? 'border-[#8B5CF6]' : 'border-white/[0.08]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-white truncate">{profile.name}</h2>
                    {isActive && (
                      <span className="text-xs font-semibold text-[#A78BFA] whitespace-nowrap shrink-0">
                        Activo
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-[#9B8FB8] tabular-nums">
                    MCBE {profile.mcVersion} · {runtime?.name ?? profile.runtimeId}
                  </p>
                  <p className="mt-1 text-xs text-[#9B8FB8] tabular-nums">
                    {isVanilla
                      ? 'Sin mods (Vanilla)'
                      : `${profile.modIds.length} ${profile.modIds.length === 1 ? 'mod asignado' : 'mods asignados'}`}{' '}
                    · {profile.lastPlayed ?? 'Sin iniciar'}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectProfile(profile.id)}
                    disabled={isActive}
                    className={`min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-white/[0.04] text-[#9B8FB8] cursor-default'
                        : 'bg-white/[0.08] hover:bg-[#8B5CF6] text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{isActive ? 'Seleccionado' : 'Usar perfil'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(profile)}
                    aria-label={`Editar ${profile.name}`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#EDE9F6] transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteProfile(profile.id)}
                    disabled={state.profiles.length <= 1}
                    aria-label={`Eliminar ${profile.name}`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed text-[#EDE9F6] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Profile Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#13111C] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 id="profile-modal-title" className="text-lg font-semibold text-white">
                {editingProfile ? `Editar perfil "${editingProfile.name}"` : 'Crear nuevo perfil'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar formulario de perfil"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#9B8FB8] hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {formErrors.length > 0 && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-200 space-y-1"
                >
                  {formErrors.map((err) => (
                    <p key={err}>{err}</p>
                  ))}
                </div>
              )}

              <div>
                <label htmlFor="profile-name-input" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
                  Nombre del perfil
                </label>
                <input
                  id="profile-name-input"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Amethyst Survival 1.21"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm text-white placeholder-[#6A6085] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="profile-version-select" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
                    Versión MCBE
                  </label>
                  <select
                    id="profile-version-select"
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    {state.mcVersions.map((ver) => (
                      <option key={ver.version} value={ver.version}>
                        {ver.version} {ver.installedOnDevice ? '(Instalada)' : '(Pendiente)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="profile-runtime-select" className="block text-xs font-medium text-[#C4BBE0] mb-1.5">
                    Runtime
                  </label>
                  <select
                    id="profile-runtime-select"
                    value={formRuntimeId}
                    onChange={(e) => setFormRuntimeId(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0A10] border border-white/15 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                  >
                    {state.runtimes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedFormRuntime?.type !== RuntimeType.VANILLA && (
                <div>
                  <span className="block text-xs font-medium text-[#C4BBE0] mb-2">
                    Mods asignados al perfil
                  </span>
                  <div className="rounded-xl bg-[#0B0A10] border border-white/10 divide-y divide-white/[0.06] max-h-48 overflow-y-auto">
                    {state.mods.map((mod) => {
                      const checked = formModIds.includes(mod.id);
                      return (
                        <label
                          key={mod.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-white/[0.03]"
                        >
                          <div className="min-w-0">
                            <span className="block text-sm text-white truncate">{mod.name}</span>
                            <span className="block text-xs text-[#9B8FB8] font-mono">
                              {mod.abi} · {mod.libraryFile}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleFormMod(mod.id)}
                            className="w-4 h-4 accent-[#8B5CF6] shrink-0"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-sm font-medium text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-sm font-semibold text-white transition-colors"
                >
                  Guardar perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
