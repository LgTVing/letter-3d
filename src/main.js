import './style.css';
import {
  DEFAULT_LETTER,
  I18N,
  decodeLetterFromHash,
  encodeLetterToHash,
} from './config/defaultLetter.js';
import { LetterAudioEngine } from './audio/penAudio.js';
import { LetterScene, STATES } from './scene/LetterScene.js';
import { createSamplePhotoDataUrl } from './scene/textures.js';

// Load letter from URL hash if shared, else use default sample
let currentLetter = decodeLetterFromHash(window.location.hash) || structuredClone(DEFAULT_LETTER);
let currentLang = 'vi';
let currentState = STATES.SEALED;
let pendingPhotos = [
  currentLetter.photos[0]?.src || null,
  currentLetter.photos[1]?.src || null,
];
let selectedTheme = currentLetter.theme || 'love';

const audio = new LetterAudioEngine();

// DOM references
const els = {
  mount: document.getElementById('canvas-mount'),
  loadingVeil: document.getElementById('loading-veil'),
  loadingText: document.getElementById('loading-text'),
  infoCard: document.getElementById('letter-info-card'),
  cardTitle: document.getElementById('card-title'),
  cardFrom: document.getElementById('card-from'),
  cardDate: document.getElementById('card-date'),
  btnQuickEdit: document.getElementById('btn-quick-edit'),

  controlsSealed: document.getElementById('controls-sealed'),
  controlsOpened: document.getElementById('controls-opened'),
  btnSeeAll: document.getElementById('btn-see-all'),
  btnVolumeSealed: document.getElementById('btn-volume-sealed'),

  btnMoreMenu: document.getElementById('btn-more-menu'),
  moreDropdown: document.getElementById('more-dropdown'),
  menuPutAway: document.getElementById('menu-put-away'),
  menuMuteToggle: document.getElementById('menu-mute-toggle'),
  volumeSlider: document.getElementById('volume-slider'),
  volumeValue: document.getElementById('volume-value'),
  menuReplay: document.getElementById('menu-replay'),
  menuCustomize: document.getElementById('menu-customize'),
  menuShare: document.getElementById('menu-share'),
  btnReplyOpen: document.getElementById('btn-reply-open'),

  bottomLeftCta: document.getElementById('bottom-left-cta'),
  btnWriteOwn: document.getElementById('btn-write-own'),
  hintBar: document.getElementById('hint-bar'),
  hintText: document.getElementById('hint-text'),
  holdIndicator: document.getElementById('hold-indicator'),
  holdProgressFill: document.getElementById('hold-progress-fill'),

  zoomControls: document.getElementById('zoom-controls'),
  btnZoomIn: document.getElementById('btn-zoom-in'),
  btnZoomReset: document.getElementById('btn-zoom-reset'),
  btnZoomOut: document.getElementById('btn-zoom-out'),

  toast: document.getElementById('toast'),

  editorBackdrop: document.getElementById('editor-backdrop'),
  editorForm: document.getElementById('editor-form'),
  btnCloseEditor: document.getElementById('btn-close-editor'),
  inputRecipient: document.getElementById('input-recipient'),
  inputSender: document.getElementById('input-sender'),
  inputDate: document.getElementById('input-date'),
  inputSalutation: document.getElementById('input-salutation'),
  inputBody: document.getElementById('input-body'),
  themePicker: document.getElementById('theme-picker'),
  previewPhoto0: document.getElementById('preview-photo-0'),
  previewPhoto1: document.getElementById('preview-photo-1'),
  inputPhoto0: document.getElementById('input-photo-0'),
  inputPhoto1: document.getElementById('input-photo-1'),
  inputCaption0: document.getElementById('input-caption-0'),
  inputCaption1: document.getElementById('input-caption-1'),
  btnCopyShare: document.getElementById('btn-copy-share'),
};

let toastTimer = null;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.add('hidden');
  }, 2600);
}

function syncAudioIcons() {
  const isMuted = audio.muted || audio.volume <= 0.001;
  document.querySelectorAll('.icon-sound-on').forEach((el) => el.classList.toggle('hidden', isMuted));
  document.querySelectorAll('.icon-sound-off').forEach((el) => el.classList.toggle('hidden', !isMuted));
}

function updateUIForLanguage() {
  const t = I18N[currentLang];
  document.documentElement.lang = currentLang;
  document.title = t.letterFor(currentLetter.recipient);

  els.loadingText.textContent = t.loading;
  els.cardTitle.textContent = t.letterFor(currentLetter.recipient);
  els.cardFrom.textContent = t.fromSender(currentLetter.sender);
  els.cardDate.textContent = currentLetter.date;
  els.btnSeeAll.textContent = t.seeAll;

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (typeof t[key] === 'string') {
      node.textContent = t[key];
    }
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });

  updateHintForState(currentState);
}

function updateHintForState(state) {
  const t = I18N[currentLang];
  switch (state) {
    case STATES.SEALED:
      els.hintText.textContent = t.hintSealed;
      els.hintBar.classList.remove('fade-away');
      break;
    case STATES.HOLDING:
      els.hintText.textContent = t.hintHolding;
      els.hintBar.classList.remove('fade-away');
      break;
    case STATES.OPENED_PEEK:
      els.hintText.textContent = t.hintPeek;
      els.hintBar.classList.remove('fade-away');
      break;
    case STATES.WRITING:
      els.hintText.textContent = t.hintWriting;
      els.hintBar.classList.remove('fade-away');
      break;
    case STATES.COMPLETE:
      els.hintText.textContent = t.hintComplete;
      els.hintBar.classList.remove('fade-away');
      break;
    default:
      els.hintBar.classList.add('fade-away');
      break;
  }
}

function updateUIForState(state) {
  currentState = state;
  const isSealed = state === STATES.SEALED;
  const isOpened = state === STATES.COMPLETE;
  const showOpenedChrome = state === STATES.COMPLETE || state === STATES.WRITING;

  els.infoCard.classList.toggle('fade-away', !isSealed);
  els.controlsSealed.classList.toggle('hidden', showOpenedChrome);
  els.controlsOpened.classList.toggle('hidden', !showOpenedChrome);
  els.bottomLeftCta.classList.toggle('hidden', !isOpened);
  els.zoomControls.classList.toggle('hidden', !isOpened);
  els.holdIndicator.classList.toggle('hidden', state !== STATES.HOLDING);

  if (!showOpenedChrome) {
    els.moreDropdown.classList.add('hidden');
  }

  updateHintForState(state);
}

function applyThemeAttr(themeId) {
  document.body.setAttribute('data-theme', themeId || 'love');
}

// Editor Modal helpers
function openEditor() {
  els.moreDropdown.classList.add('hidden');
  els.inputRecipient.value = currentLetter.recipient;
  els.inputSender.value = currentLetter.sender;
  els.inputDate.value = currentLetter.date;
  els.inputSalutation.value = currentLetter.salutation;
  els.inputBody.value = currentLetter.body;
  els.inputCaption0.value = currentLetter.photos[0]?.caption || '';
  els.inputCaption1.value = currentLetter.photos[1]?.caption || '';

  pendingPhotos = [
    currentLetter.photos[0]?.src || null,
    currentLetter.photos[1]?.src || null,
  ];
  els.previewPhoto0.src = pendingPhotos[0] || createSamplePhotoDataUrl('sunset-walk');
  els.previewPhoto1.src = pendingPhotos[1] || createSamplePhotoDataUrl('starry-night');

  selectedTheme = currentLetter.theme || 'love';
  els.themePicker.querySelectorAll('.theme-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.themeId === selectedTheme);
  });

  els.editorBackdrop.classList.remove('hidden');
}

function closeEditor() {
  els.editorBackdrop.classList.add('hidden');
}

function readUploadedImage(file, slotIndex, previewEl) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingPhotos[slotIndex] = reader.result;
    previewEl.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function copyShareableLink(letterObj) {
  const hash = encodeLetterToHash(letterObj);
  const url = `${window.location.origin}${window.location.pathname}${hash}`;
  window.history.replaceState(null, '', hash);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).catch(() => {});
  }
  showToast(I18N[currentLang].copied);
}

async function bootstrap() {
  applyThemeAttr(currentLetter.theme);
  updateUIForLanguage();

  // Wait for handwriting webfont (including full Vietnamese subset!) to load so CanvasTexture renders crisply
  try {
    const viSample =
      'ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴáàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ 20/11';
    await Promise.race([
      Promise.all([
        document.fonts.load('500 48px "Dancing Script"', viSample),
        document.fonts.load('600 48px "Dancing Script"', viSample),
        document.fonts.load('700 48px "Dancing Script"', viSample),
        document.fonts.load('italic 600 26px "Playfair Display"', viSample),
      ]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    // fallback safely if offline
  }

  const scene = new LetterScene(els.mount, currentLetter, audio, {
    onStateChange: (nextState) => updateUIForState(nextState),
    onHoldProgress: (p) => {
      els.holdProgressFill.style.width = `${Math.round(p * 100)}%`;
    },
  });

  // Hide loading veil smoothly
  setTimeout(() => {
    els.loadingVeil.classList.add('fade-out');
  }, 280);

  // --- Wire UI Events ---

  els.btnSeeAll.addEventListener('click', () => scene.seeAll());
  els.btnQuickEdit.addEventListener('click', openEditor);
  els.btnReplyOpen.addEventListener('click', openEditor);
  els.btnWriteOwn.addEventListener('click', openEditor);

  els.btnVolumeSealed.addEventListener('click', () => {
    audio.ensureContext();
    audio.setMuted(!audio.muted);
    syncAudioIcons();
  });

  els.btnMoreMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = els.moreDropdown.classList.toggle('hidden');
    els.btnMoreMenu.setAttribute('aria-expanded', String(!isHidden));
  });

  document.addEventListener('click', (e) => {
    if (!els.moreDropdown.classList.contains('hidden') && !e.target.closest('.menu-anchor')) {
      els.moreDropdown.classList.add('hidden');
      els.btnMoreMenu.setAttribute('aria-expanded', 'false');
    }
  });

  els.menuPutAway.addEventListener('click', () => {
    els.moreDropdown.classList.add('hidden');
    scene.putAway();
  });

  els.menuReplay.addEventListener('click', () => {
    els.moreDropdown.classList.add('hidden');
    scene.replayWriting();
  });

  els.menuCustomize.addEventListener('click', openEditor);
  els.menuShare.addEventListener('click', () => {
    els.moreDropdown.classList.add('hidden');
    copyShareableLink(currentLetter);
  });

  els.menuMuteToggle.addEventListener('click', () => {
    audio.ensureContext();
    audio.setMuted(!audio.muted);
    syncAudioIcons();
  });

  els.volumeSlider.addEventListener('input', (e) => {
    audio.ensureContext();
    const val = Number(e.target.value);
    els.volumeValue.textContent = `${val}%`;
    audio.setMuted(val === 0);
    audio.setVolume(val / 100);
    syncAudioIcons();
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentLang = btn.dataset.lang;
      updateUIForLanguage();
    });
  });

  // Zoom controls
  els.btnZoomIn.addEventListener('click', () => scene.setZoomDelta(0.22));
  els.btnZoomOut.addEventListener('click', () => scene.setZoomDelta(-0.22));
  els.btnZoomReset.addEventListener('click', () => scene.resetView());

  // Editor modal events
  els.btnCloseEditor.addEventListener('click', closeEditor);
  els.editorBackdrop.addEventListener('click', (e) => {
    if (e.target === els.editorBackdrop) closeEditor();
  });

  els.themePicker.querySelectorAll('.theme-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      selectedTheme = chip.dataset.themeId;
      els.themePicker.querySelectorAll('.theme-chip').forEach((c) => {
        c.classList.toggle('active', c === chip);
      });
    });
  });

  els.inputPhoto0.addEventListener('change', (e) => {
    readUploadedImage(e.target.files?.[0], 0, els.previewPhoto0);
  });
  els.inputPhoto1.addEventListener('change', (e) => {
    readUploadedImage(e.target.files?.[0], 1, els.previewPhoto1);
  });

  function collectFormLetter() {
    return {
      ...currentLetter,
      recipient: els.inputRecipient.value.trim() || DEFAULT_LETTER.recipient,
      sender: els.inputSender.value.trim() || DEFAULT_LETTER.sender,
      date: els.inputDate.value.trim() || DEFAULT_LETTER.date,
      salutation: els.inputSalutation.value.trim() || DEFAULT_LETTER.salutation,
      body: els.inputBody.value.trim() || DEFAULT_LETTER.body,
      theme: selectedTheme,
      photos: [
        {
          src: pendingPhotos[0],
          preset: 'sunset-walk',
          caption: els.inputCaption0.value.trim() || DEFAULT_LETTER.photos[0].caption,
        },
        {
          src: pendingPhotos[1],
          preset: 'starry-night',
          caption: els.inputCaption1.value.trim() || DEFAULT_LETTER.photos[1].caption,
        },
      ],
    };
  }

  els.btnCopyShare.addEventListener('click', () => {
    const draft = collectFormLetter();
    copyShareableLink(draft);
  });

  els.editorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    currentLetter = collectFormLetter();
    applyThemeAttr(currentLetter.theme);
    updateUIForLanguage();
    closeEditor();
    await scene.updateLetter(currentLetter, true);
    showToast(I18N[currentLang].applied);
  });

  syncAudioIcons();
}

bootstrap();
