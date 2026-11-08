import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from 'react';
import { cardCatalog } from './data/cards';
import { CARD_TEMPLATE } from './template';
import type { CardData, ProjectDocument, StoredAsset } from './types';
import { deleteAsset, getAsset, loadProject, replaceProjectAndAssets, saveAsset, saveProject } from './lib/database';
import { exportCardPng, composeCard } from './lib/renderer';
import { imageFromBlob, validateImageFile } from './lib/files';
import { matchesAspectRatio } from './lib/geometry';
import { exportProjectZip, importProjectZip, isKnownTemplateVersion } from './lib/projectArchive';

const displayNumber = (number: number) => String(number).padStart(2, '0');

export default function App() {
  const [project, setProject] = useState<ProjectDocument | null>(null);
  const [selectedId, setSelectedId] = useState('lenormand-08');
  const [frameBlob, setFrameBlob] = useState<Blob | null>(null);
  const [illustrationBlob, setIllustrationBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragOrigin = useRef<{ x: number; y: number; transformX: number; transformY: number } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const frameInputRef = useRef<HTMLInputElement>(null);
  const illustrationInputRef = useRef<HTMLInputElement>(null);

  const selectedCard = project?.cards[selectedId];
  const baseCard = useMemo(() => cardCatalog.find((card) => card.id === selectedId)!, [selectedId]);
  const currentCard = selectedCard ?? { ...baseCard, illustrationAssetId: null, transform: { zoom: 1, x: 0, y: 0 } };
  const framePreviewUrl = useMemo(() => frameBlob ? URL.createObjectURL(frameBlob) : null, [frameBlob]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const saved = await loadProject();
        const savedFrame = saved.frameAssetId ? await getAsset(saved.frameAssetId) : undefined;
        const savedIllustration = saved.cards['lenormand-08']?.illustrationAssetId
          ? await getAsset(saved.cards['lenormand-08'].illustrationAssetId!) : undefined;
        if (mounted) {
          setProject(saved);
          setFrameBlob(savedFrame?.blob ?? null);
          setIllustrationBlob(savedIllustration?.blob ?? null);
          setIsReady(true);
        }
      } catch (cause) {
        if (mounted) { setError(`Não foi possível abrir o armazenamento local: ${messageOf(cause)}`); setIsReady(true); }
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => () => { if (framePreviewUrl) URL.revokeObjectURL(framePreviewUrl); }, [framePreviewUrl]);

  useEffect(() => {
    if (!project) return;
    const id = currentCard.illustrationAssetId;
    let active = true;
    if (!id) { setIllustrationBlob(null); return; }
    void getAsset(id).then((asset) => { if (active) setIllustrationBlob(asset?.blob ?? null); })
      .catch((cause) => { if (active) setError(`Erro ao recuperar ilustração: ${messageOf(cause)}`); });
    return () => { active = false; };
  }, [currentCard.illustrationAssetId, selectedId]);

  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas || !isReady) return;
    void (async () => {
      try {
        const frame = frameBlob ?? undefined;
        const composed = await composeCard({ card: currentCard, template: CARD_TEMPLATE, illustration: illustrationBlob, frame, transform: currentCard.transform });
        if (active) {
          const context = canvas.getContext('2d');
          context?.clearRect(0, 0, canvas.width, canvas.height);
          context?.drawImage(composed, 0, 0);
        }
      } catch (cause) { if (active) setError(`Falha na prévia: ${messageOf(cause)}`); }
    })();
    return () => { active = false; };
  }, [currentCard, frameBlob, illustrationBlob, isReady]);

  const commit = useCallback(async (next: ProjectDocument) => {
    setProject(next);
    try { await saveProject(next); setNotice('Salvo neste navegador'); }
    catch (cause) { setError(`Não foi possível salvar localmente: ${messageOf(cause)}`); }
  }, []);

  const updateSelected = useCallback(async (changes: Partial<CardData> & { transform?: typeof currentCard.transform; illustrationAssetId?: string | null }) => {
    if (!project) return;
    const oldCard = project.cards[selectedId] ?? currentCard;
    const next = { ...project, cards: { ...project.cards, [selectedId]: { ...oldCard, ...changes } } };
    await commit(next);
  }, [project, selectedId, currentCard, commit]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>, kind: 'frame' | 'illustration') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !project) return;
    try {
      validateImageFile(file, kind);
      if (kind === 'frame') {
        const image = await imageFromBlob(file);
        if (!matchesAspectRatio(image.naturalWidth, image.naturalHeight, CARD_TEMPLATE.canvas.width / CARD_TEMPLATE.canvas.height)) {
          throw new Error('A moldura PNG precisa ter proporção 2:3 para manter a geometria da carta.');
        }
      }
      if (kind === 'illustration' && currentCard.approvalStatus === 'approved') {
        throw new Error('Esta carta está aprovada. Altere o status para Rascunho antes de substituir a ilustração.');
      }
      setIsBusy(true); setError('');
      const asset: StoredAsset = { id: crypto.randomUUID(), blob: file, filename: file.name, mimeType: file.type, role: kind, createdAt: new Date().toISOString() };
      await saveAsset(asset);
      if (kind === 'frame') {
        const oldId = project.frameAssetId;
        await commit({ ...project, frameAssetId: asset.id });
        setFrameBlob(file);
        if (oldId) await deleteAsset(oldId);
        setNotice('Moldura PNG carregada e salva localmente');
      } else {
        const oldId = currentCard.illustrationAssetId;
        await updateSelected({ illustrationAssetId: asset.id });
        setIllustrationBlob(file);
        if (oldId) await deleteAsset(oldId);
        setNotice(`Ilustração de ${currentCard.title} carregada e salva`);
      }
    } catch (cause) { setError(messageOf(cause)); }
    finally { setIsBusy(false); }
  };

  const changeSelected = (id: string) => {
    setSelectedId(id); setError('');
  };

  const exportPng = async () => {
    setIsBusy(true); setError('');
    try {
      const blob = await exportCardPng({ card: currentCard, template: CARD_TEMPLATE, illustration: illustrationBlob, frame: frameBlob, transform: currentCard.transform });
      download(blob, `${displayNumber(currentCard.number)}-${slug(currentCard.title)}.png`);
      setNotice('PNG exportado na resolução nativa do template');
    } catch (cause) { setError(`Falha na exportação PNG: ${messageOf(cause)}`); }
    finally { setIsBusy(false); }
  };

  const saveNow = async () => {
    if (!project) return;
    setIsBusy(true); setError('');
    try { await saveProject(project); setNotice('Projeto salvo neste navegador'); }
    catch (cause) { setError(`Não foi possível salvar o projeto: ${messageOf(cause)}`); }
    finally { setIsBusy(false); }
  };

  const exportProject = async () => {
    if (!project) return;
    setIsBusy(true); setError('');
    try {
      const ids = new Set<string>();
      if (project.frameAssetId) ids.add(project.frameAssetId);
      Object.values(project.cards).forEach((card) => { if (card.illustrationAssetId) ids.add(card.illustrationAssetId); });
      const assets = (await Promise.all([...ids].map(getAsset))).filter((asset): asset is StoredAsset => Boolean(asset));
      const blob = await exportProjectZip(project, assets);
      download(blob, `lenormand-biblico-projeto-${new Date().toISOString().slice(0, 10)}.zip`);
      setNotice('Projeto exportado em ZIP');
    } catch (cause) { setError(`Falha ao exportar projeto: ${messageOf(cause)}`); }
    finally { setIsBusy(false); }
  };

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setIsBusy(true); setError('');
    try {
      const imported = await importProjectZip(file);
      const versionNotice = isKnownTemplateVersion(imported.project.templateVersion) ? '' : ' Versão de template diferente será preservada no projeto.';
      // O manifesto e todos os recursos são validados antes do primeiro write.
      await replaceProjectAndAssets(imported.project, imported.assets);
      setProject(imported.project);
      const frame = imported.project.frameAssetId ? imported.assets.find((asset) => asset.id === imported.project.frameAssetId) : undefined;
      const imageId = imported.project.cards[selectedId]?.illustrationAssetId;
      setFrameBlob(frame?.blob ?? null);
      setIllustrationBlob(imported.assets.find((asset) => asset.id === imageId)?.blob ?? null);
      setNotice(`Projeto importado com sucesso.${versionNotice}`);
    } catch (cause) { setError(`Importação cancelada: ${messageOf(cause)}`); }
    finally { setIsBusy(false); }
  };

  const setTransform = (key: 'zoom' | 'x' | 'y', value: number) => updateSelected({ transform: { ...currentCard.transform, [key]: value } });
  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!illustrationBlob) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOrigin.current = { x: event.clientX, y: event.clientY, transformX: currentCard.transform.x, transformY: currentCard.transform.y };
    setIsDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const origin = dragOrigin.current;
    const canvas = canvasRef.current;
    if (!origin || !canvas) return;
    const bounds = canvas.getBoundingClientRect();
    void updateSelected({ transform: {
      ...currentCard.transform,
      x: Math.round(origin.transformX + (event.clientX - origin.x) * CARD_TEMPLATE.canvas.width / bounds.width),
      y: Math.round(origin.transformY + (event.clientY - origin.y) * CARD_TEMPLATE.canvas.height / bounds.height),
    } });
  };
  const onPointerUp = () => { dragOrigin.current = null; setIsDragging(false); };

  if (!isReady || !project) return <main className="loading"><span className="loading-mark">L</span><p>Abrindo seu estúdio local…</p></main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Compositor Lenormand Bíblico">
          <span className="brand-mark">L</span>
          <span><strong>Casa Lenormand</strong><small>Compositor bíblico</small></span>
        </a>
        <div className="top-actions">
          <span className="save-state"><i />{notice || 'Armazenamento local'}</span>
          <button className="button button-quiet" onClick={() => void saveNow()} disabled={isBusy}>Salvar</button>
          <button className="button button-quiet top-export" onClick={() => void exportProject()} disabled={isBusy}>Exportar projeto</button>
          <button className="button button-primary top-import" onClick={() => importInputRef.current?.click()} disabled={isBusy}>Importar ZIP</button>
          <input ref={importInputRef} hidden type="file" accept=".zip,application/zip" onChange={(event) => void importProject(event)} />
        </div>
      </header>

      <main id="top" className="workspace">
        <aside className="sidebar">
          <div className="section-heading"><span className="eyebrow">SEU BARALHO</span><span className="count-pill">36 cartas</span></div>
          <p className="sidebar-intro">Selecione uma carta para editar os dados e a ilustração.</p>
          <div className="card-list" role="listbox" aria-label="Cartas do baralho">
            {cardCatalog.map((card) => {
              const item = project.cards[card.id];
              const active = selectedId === card.id;
              return <button key={card.id} role="option" aria-selected={active} className={`card-row ${active ? 'active' : ''}`} onClick={() => void changeSelected(card.id)}>
                <span className="card-num">{displayNumber(card.number)}</span>
                <span className="card-title-small">{item?.title ?? card.title}</span>
                <span className={`status-dot ${item?.approvalStatus === 'approved' ? 'approved' : ''}`} title={item?.approvalStatus === 'approved' ? 'Aprovada' : 'Rascunho'} />
              </button>;
            })}
          </div>
          <div className="sidebar-footer"><span className="local-icon">◉</span><span>Seus arquivos ficam neste navegador</span></div>
        </aside>

        <section className="editor-pane" aria-label="Editor da carta">
          <div className="editor-heading">
            <div><span className="eyebrow">EDIÇÃO DA CARTA</span><h1><span className="heading-number">{displayNumber(currentCard.number)}</span>{currentCard.title}</h1></div>
            <label className="approval-select"><span>Status</span><select value={currentCard.approvalStatus} onChange={(event) => void updateSelected({ approvalStatus: event.target.value as CardData['approvalStatus'] })}><option value="draft">Rascunho</option><option value="approved">Aprovada</option></select></label>
          </div>
          <div className="field-grid">
            <label className="field"><span>Nome da carta</span><input value={currentCard.title} maxLength={48} onChange={(event) => void updateSelected({ title: event.target.value })} /></label>
            <label className="field"><span>Referência bíblica</span><div className="reference-entry"><input value={currentCard.bibleReference} placeholder="Referência pendente" maxLength={100} onChange={(event) => void updateSelected({ bibleReference: event.target.value, referenceStatus: 'pending' })} /><select aria-label="Status da referência bíblica" value={currentCard.referenceStatus} onChange={(event) => void updateSelected({ referenceStatus: event.target.value as CardData['referenceStatus'] })}><option value="pending">Pendente</option><option value="approved">Aprovada</option></select></div></label>
          </div>
          <div className="canvas-section">
            <div className="canvas-toolbar"><div><span className="eyebrow">PRÉVIA EM TEMPO REAL</span><span className="preview-hint">Arraste a imagem para reposicionar</span></div><span className="resolution-badge">{CARD_TEMPLATE.canvas.width} × {CARD_TEMPLATE.canvas.height} px · provisório</span></div>
            <div className="preview-stage">
              <div className="card-preview-wrap">
                <canvas ref={canvasRef} width={CARD_TEMPLATE.canvas.width} height={CARD_TEMPLATE.canvas.height} className={`preview-canvas ${illustrationBlob ? 'has-illustration' : ''} ${isDragging ? 'dragging' : ''}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} aria-label={`Prévia da carta ${displayNumber(currentCard.number)} ${currentCard.title}`} />
                {!illustrationBlob && <button className="empty-upload" onClick={() => illustrationInputRef.current?.click()}><span className="upload-plus">+</span><strong>Adicione uma ilustração</strong><small>PNG, JPEG, WebP ou GIF · até 20 MB</small></button>}
              </div>
            </div>
          </div>
          <div className="editor-actions">
            <button className="button button-secondary" onClick={() => illustrationInputRef.current?.click()} disabled={isBusy}><span className="button-icon">↑</span>{illustrationBlob ? 'Trocar ilustração' : 'Carregar ilustração'}</button>
            <button className="button button-primary" onClick={() => void exportPng()} disabled={isBusy}><span className="button-icon">↓</span>Exportar PNG</button>
            <input ref={illustrationInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => void handleFile(event, 'illustration')} />
          </div>
        </section>

        <aside className="settings-pane">
          <div className="panel-block">
            <span className="eyebrow">IDENTIDADE VISUAL</span><h2>Moldura do baralho</h2>
            <p className="panel-copy">Uma única moldura PNG é aplicada inteira sobre todas as cartas.</p>
            <div className={`frame-preview ${frameBlob ? 'has-frame' : ''}`}>
              {framePreviewUrl ? <img src={framePreviewUrl} alt="Prévia da moldura carregada" /> : <div className="frame-placeholder"><span>◇</span><small>Moldura provisória</small></div>}
            </div>
            <button className="button button-outline full-width" onClick={() => frameInputRef.current?.click()} disabled={isBusy}><span className="button-icon">↑</span>{frameBlob ? 'Substituir moldura PNG' : 'Carregar moldura PNG'}</button>
            <input ref={frameInputRef} hidden type="file" accept="image/png,.png" onChange={(event) => void handleFile(event, 'frame')} />
            <p className="micro-note">PNG transparente · até 20 MB</p>
          </div>
          <div className="panel-block image-controls">
            <span className="eyebrow">POSICIONAMENTO</span><h2>Ilustração</h2>
            <label className="range-label"><span>Zoom</span><b>{currentCard.transform.zoom.toFixed(2)}×</b></label>
            <input aria-label="Zoom da ilustração" className="range" type="range" min="0.5" max="3" step="0.01" value={currentCard.transform.zoom} onChange={(event) => void setTransform('zoom', Number(event.target.value))} />
            <div className="range-ends"><span>Enquadrar</span><span>Ampliar</span></div>
            <div className="nudge-grid" aria-label="Deslocar ilustração">
              <button aria-label="Mover para cima" onClick={() => void setTransform('y', currentCard.transform.y - 10)}>↑</button>
              <div><button aria-label="Mover para esquerda" onClick={() => void setTransform('x', currentCard.transform.x - 10)}>←</button><button aria-label="Centralizar ilustração" onClick={() => void updateSelected({ transform: { zoom: 1, x: 0, y: 0 } })}>•</button><button aria-label="Mover para direita" onClick={() => void setTransform('x', currentCard.transform.x + 10)}>→</button></div>
              <button aria-label="Mover para baixo" onClick={() => void setTransform('y', currentCard.transform.y + 10)}>↓</button>
            </div>
          </div>
          <div className="template-note"><span>i</span><p><strong>Template provisório</strong><br />Posições e pixels são referências de desenvolvimento, sem dimensões físicas de impressão. A geometria será revisada após receber a moldura definitiva.</p></div>
        </aside>
      </main>

      <footer className="app-footer"><span>COMPOSITOR LENORMAND BÍBLICO</span><span>Processamento local · nenhuma imagem enviada</span></footer>
      {(error || notice) && <div className={`toast ${error ? 'toast-error' : ''}`} role={error ? 'alert' : 'status'}><span>{error || notice}</span><button aria-label="Fechar aviso" onClick={() => { setError(''); setNotice(''); }}>×</button></div>}
      {isBusy && <div className="busy-indicator" aria-label="Processando" />}
    </div>
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function slug(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function messageOf(cause: unknown) { return cause instanceof Error ? cause.message : 'Erro inesperado.'; }
