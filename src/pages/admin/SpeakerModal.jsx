import { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Camera, 
  Trash2, 
  Check, 
  Loader2, 
  Globe, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { LinkedinIcon, GithubIcon, InstagramIcon } from './SocialIcons';
import { Dialog, Field, btn, ICON_BTN, initials } from './ui';
import { uploadSpeakerPhoto } from '../../lib/activityService';

const DEFAULT_CLASSIFICATIONS = [
  { id: 'Convidado Externo', label: 'Convidado Externo', color: '#8FA0FF' },
  { id: 'Professor UFU', label: 'Professor UFU', color: '#9BE382' },
  { id: 'Aluno Pesquisador', label: 'Aluno Pesquisador', color: '#FFD666' },
  { id: 'Patrocinador', label: 'Patrocinador', color: '#F59AC0' }
];

const DEFAULT_SAMPLE_PHOTOS = [
  { label: 'Homem Tech', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { label: 'Mulher Tech', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80' },
  { label: 'Especialista IA', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { label: 'Professora UFU', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80' }
];

export function SpeakerModal({
  isOpen,
  onClose,
  speaker = null,
  classifications = DEFAULT_CLASSIFICATIONS,
  samplePhotos = DEFAULT_SAMPLE_PHOTOS,
  onSave,
  onDelete
}) {
  const fileInputRef = useRef(null);
  const isEditing = Boolean(speaker?.id);

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: '',
    institution: '',
    classification: 'Convidado Externo',
    bio: '',
    photo: '',
    socialLinks: { linkedin: '', github: '', instagram: '', website: '' }
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setUploadError(null);
      setIsUploading(false);
      setIsSubmitting(false);
      return;
    }

    if (speaker) {
      let socialObj = { linkedin: '', github: '', instagram: '', website: '' };
      if (typeof speaker.socialLinks === 'object' && speaker.socialLinks !== null && !Array.isArray(speaker.socialLinks)) {
        socialObj = { ...socialObj, ...speaker.socialLinks };
      } else if (Array.isArray(speaker.socialLinks)) {
        socialObj.linkedin = speaker.socialLinks[0] || '';
        socialObj.github = speaker.socialLinks[1] || '';
        socialObj.instagram = speaker.socialLinks[2] || '';
        socialObj.website = speaker.socialLinks[3] || '';
      }

      setForm({
        name: speaker.name || '',
        email: speaker.email || '',
        role: speaker.role || '',
        institution: speaker.institution || speaker.role || '',
        classification: speaker.classification || 'Convidado Externo',
        bio: speaker.bio || '',
        photo: speaker.photo || '',
        socialLinks: socialObj
      });
    } else {
      setForm({
        name: '',
        email: '',
        role: '',
        institution: '',
        classification: 'Convidado Externo',
        bio: '',
        photo: '',
        socialLinks: { linkedin: '', github: '', instagram: '', website: '' }
      });
    }
  }, [isOpen, speaker]);

  if (!isOpen) return null;

  const handleFileChange = async (file) => {
    if (!file) return;
    setUploadError(null);

    if (!file.type || !file.type.startsWith('image/')) {
      setUploadError('Formato inválido. Por favor, envie uma imagem (JPG, PNG, WebP ou GIF).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('A imagem precisa ter até 10MB.');
      return;
    }

    try {
      setIsUploading(true);
      const photoUrl = await uploadSpeakerPhoto(file, speaker?.id || 'new_speaker');
      setForm(prev => ({ ...prev, photo: photoUrl }));
    } catch (err) {
      console.error('Erro ao fazer upload da foto:', err);
      setUploadError(err.message || 'Falha ao processar a foto. Tente novamente.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = form.name.trim();
    if (!cleanName) {
      alert('Por favor, informe o nome completo do palestrante.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        id: speaker?.id,
        name: cleanName,
        email: form.email.trim(),
        role: form.role.trim(),
        institution: form.institution.trim() || form.role.trim(),
        classification: form.classification || 'Convidado Externo',
        bio: form.bio.trim(),
        photo: form.photo || (samplePhotos[0]?.url || ''),
        socialLinks: form.socialLinks,
        inviteViaEmail: Boolean(speaker?.inviteViaEmail),
        inviteStatus: speaker?.inviteStatus || 'Aceito'
      };

      await onSave(payload);
    } catch (err) {
      console.error('Erro ao salvar palestrante:', err);
      alert('Erro ao salvar palestrante: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!speaker?.id || !onDelete) return;
    if (window.confirm(`Tem certeza que deseja excluir "${form.name || speaker.name}" da lista de palestrantes?`)) {
      try {
        await onDelete(speaker.id, form.name || speaker.name);
        onClose();
      } catch (err) {
        alert('Erro ao excluir: ' + err.message);
      }
    }
  };

  const footer = (
    <div className="flex w-full items-center justify-between gap-3">
      {isEditing ? (
        <button
          type="button"
          onClick={handleDelete}
          className={`${btn('danger')} !min-h-10 px-3 text-[13px]`}
          title="Excluir palestrante"
        >
          <Trash2 size={16} aria-hidden="true" />
          <span>Excluir</span>
        </button>
      ) : <div />}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className={`${btn('secondary')} !min-h-10 text-[13px]`}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className={`${btn('action')} !min-h-10 text-[13px]`}
          disabled={isSubmitting || isUploading}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Check size={16} aria-hidden="true" />
              <span>{isEditing ? 'Atualizar Palestrante' : 'Cadastrar Palestrante'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <Dialog
      title={isEditing ? 'Editar Palestrante' : 'Novo Palestrante / Convidado'}
      onClose={onClose}
      footer={footer}
      wide
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-text">
        {/* FOTO E AVATAR UPLOADER */}
        <div className="rounded-2xl border border-line-2 bg-surface-raised p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {/* Círculo do Avatar */}
            <div
              className={`relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-2 transition-all ${
                isDragging 
                  ? 'ring-action ring-offset-2 ring-offset-surface' 
                  : 'ring-line-2'
              } bg-surface`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              title="Clique para selecionar ou arraste uma foto"
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center gap-1 text-action">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-[10px] font-bold">Enviando</span>
                </div>
              ) : form.photo ? (
                <img
                  src={form.photo}
                  alt={form.name || 'Palestrante'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface to-surface-selected text-[20px] font-black text-text-2">
                  {form.name ? initials(form.name) : <Camera size={26} className="text-text-3" />}
                </div>
              )}

              {/* Overlay hover */}
              {!isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                  <Camera size={20} className="text-white" />
                </div>
              )}
            </div>

            {/* Ações do Upload */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`${btn('secondary')} !min-h-9 gap-1.5 px-3 text-[13px]`}
                >
                  <Upload size={15} aria-hidden="true" />
                  <span>{form.photo ? 'Trocar Foto' : 'Fazer Upload'}</span>
                </button>

                {form.photo && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, photo: '' }))}
                    className={`${btn('quiet')} !min-h-9 text-[12px] text-err hover:bg-err/10`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Remover foto</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />

              <p className="m-0 mt-1.5 text-[12px] text-text-3">
                Envie JPG, PNG ou WebP de até 10MB. Formato quadrado recomendado.
              </p>

              {uploadError && (
                <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-err">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Presets de Amostra */}
          {samplePhotos.length > 0 && (
            <div className="mt-3.5 border-t border-line-2 pt-3">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-3">
                Ou selecione um avatar padrão:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {samplePhotos.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, photo: preset.url }))}
                    className={`press flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                      form.photo === preset.url
                        ? 'border-action bg-action/10 text-action font-bold'
                        : 'border-line-2 bg-surface text-text-2 hover:bg-surface-selected'
                    }`}
                  >
                    <img src={preset.url} alt="" className="h-4 w-4 rounded-full object-cover" />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* NOME E EMAIL */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome Completo *" hint="Como aparecerá na grade e nos crachás">
            {(id) => (
              <input
                id={id}
                type="text"
                required
                placeholder="Ex: Dra. Maria Santos"
                className="field"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            )}
          </Field>

          <Field label="E-mail de Contato" hint="Para confirmações e envio de certificados">
            {(id) => (
              <input
                id={id}
                type="email"
                placeholder="maria.santos@ufu.br"
                className="field"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              />
            )}
          </Field>
        </div>

        {/* CLASSIFICAÇÃO */}
        <Field label="Classificação do Palestrante">
          {() => (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {classifications.map((cls) => {
                const isSelected = form.classification === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, classification: cls.id }))}
                    className={`press flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-2 text-[12px] font-bold transition-all ${
                      isSelected
                        ? 'border-action bg-action/10 text-action shadow-sm'
                        : 'border-line-2 bg-surface-raised text-text-2 hover:bg-surface-selected'
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: cls.color || '#8FA0FF' }}
                    />
                    <span className="truncate">{cls.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        {/* CARGO E INSTITUIÇÃO */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Cargo / Título">
            {(id) => (
              <input
                id={id}
                type="text"
                placeholder="Ex: Professora Associada / Tech Lead"
                className="field"
                value={form.role}
                onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
              />
            )}
          </Field>

          <Field label="Empresa / Instituição">
            {(id) => (
              <input
                id={id}
                type="text"
                placeholder="Ex: FACOM - UFU / Google / Kanastra"
                className="field"
                value={form.institution}
                onChange={(e) => setForm(prev => ({ ...prev, institution: e.target.value }))}
              />
            )}
          </Field>
        </div>

        {/* MINI BIOGRAFIA */}
        <Field 
          label="Mini Biografia"
          aside={
            <span className="text-[12px] font-medium text-text-3">
              {form.bio.length} / 320
            </span>
          }
        >
          {(id) => (
            <textarea
              id={id}
              rows={3}
              maxLength={320}
              placeholder="Breve resumo da trajetória, áreas de atuação ou projetos de destaque..."
              className="field !min-h-[82px] resize-y py-2.5 leading-relaxed"
              value={form.bio}
              onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
            />
          )}
        </Field>

        {/* REDES SOCIAIS E LINKS */}
        <div className="rounded-2xl border border-line-2 bg-surface-raised p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Sparkles size={15} className="text-action" />
            <span className="text-[13px] font-extrabold text-text">
              Redes Sociais & Links Profissionais
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {/* LinkedIn */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#00D2FF]">
                <LinkedinIcon size={16} />
              </span>
              <input
                type="url"
                placeholder="https://linkedin.com/in/..."
                className="field !pl-9 text-[13px]"
                value={form.socialLinks.linkedin || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, linkedin: val }
                  }));
                }}
              />
            </div>

            {/* GitHub */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-2">
                <GithubIcon size={16} />
              </span>
              <input
                type="url"
                placeholder="https://github.com/..."
                className="field !pl-9 text-[13px]"
                value={form.socialLinks.github || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, github: val }
                  }));
                }}
              />
            </div>

            {/* Instagram */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#E1306C]">
                <InstagramIcon size={16} />
              </span>
              <input
                type="url"
                placeholder="https://instagram.com/..."
                className="field !pl-9 text-[13px]"
                value={form.socialLinks.instagram || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, instagram: val }
                  }));
                }}
              />
            </div>

            {/* Website / Lattes */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3">
                <Globe size={16} />
              </span>
              <input
                type="url"
                placeholder="Website ou Currículo Lattes..."
                className="field !pl-9 text-[13px]"
                value={form.socialLinks.website || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, website: val }
                  }));
                }}
              />
            </div>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
