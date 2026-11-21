export const THEMES = {
  love: {
    id: 'love',
    envelopeColor: '#dab7b4',
    envelopeInner: '#cba5a2',
    envelopeShade: '#b88f8c',
    waxColor: '#b31d2f',
    waxEmissive: '#38050d',
    paperColor: '#ece4dc',
    petalColor: '#f2a5b6',
    inkColor: '#2d2322',
    penBarrel: '#7c1a2d',
  },
  cream: {
    id: 'cream',
    envelopeColor: '#dfd1bc',
    envelopeInner: '#cfc0a9',
    envelopeShade: '#b8a890',
    waxColor: '#9e2a2b',
    waxEmissive: '#2c0707',
    paperColor: '#f3ede3',
    petalColor: '#e8c49a',
    inkColor: '#2c2520',
    penBarrel: '#2b3d4f',
  },
  sage: {
    id: 'sage',
    envelopeColor: '#bcc9ba',
    envelopeInner: '#abb9a9',
    envelopeShade: '#91a18f',
    waxColor: '#8d2d37',
    waxEmissive: '#29090d',
    paperColor: '#f0ece4',
    petalColor: '#d9e3d2',
    inkColor: '#232b24',
    penBarrel: '#29493b',
  },
  lavender: {
    id: 'lavender',
    envelopeColor: '#cdc2d8',
    envelopeInner: '#bcb0c9',
    envelopeShade: '#a495b3',
    waxColor: '#9b2345',
    waxEmissive: '#300715',
    paperColor: '#f2edf3',
    petalColor: '#dec8f0',
    inkColor: '#28222e',
    penBarrel: '#4b2758',
  },
};

export const I18N = {
  vi: {
    loading: 'Đang chuẩn bị lá thư...',
    letterFor: (recipient) => `Thư gửi ${recipient}`,
    fromSender: (sender) => `từ ${sender}`,
    seeAll: 'Xem toàn bộ',
    hintSealed: 'Nhấn giữ để mở · kéo để xoay',
    hintHolding: 'Giữ thêm một chút để bóc niêm phong...',
    hintPeek: 'Chạm vào lá thư',
    hintWriting: 'Chạm để viết nhanh hơn',
    hintComplete: 'Kéo khung nhìn để xem ảnh bên cạnh · Chạm ảnh để lật',
    putAway: 'Cất thư',
    replay: 'Xem lại hiệu ứng viết',
    createOwn: 'Viết thư của bạn',
    shareLink: 'Sao chép link thư',
    reply: 'Viết hồi âm',
    copied: 'Đã sao chép link chia sẻ lá thư!',
    applied: 'Đã cập nhật lá thư — hãy nhấn giữ để mở nhé!',
  },
  en: {
    loading: 'Preparing the letter...',
    letterFor: (recipient) => `A letter for ${recipient}`,
    fromSender: (sender) => `from ${sender}`,
    seeAll: 'See it all',
    hintSealed: 'Press and hold to open · drag to turn',
    hintHolding: 'Keep holding to break the wax seal...',
    hintPeek: 'Tap the letter',
    hintWriting: 'Tap to write faster',
    hintComplete: 'Drag to look around · Tap a photo to flip',
    putAway: 'Put letter away',
    replay: 'Replay handwriting',
    createOwn: 'Write your own letter',
    shareLink: 'Copy letter link',
    reply: 'Write a reply',
    copied: 'Shareable letter link copied!',
    applied: 'Letter updated — press and hold to open!',
  },
};

export const DEFAULT_LETTER = {
  recipient: 'Bé iu của anh',
  sender: 'Thương em',
  date: 'ngày 20 tháng 11, 2026',
  postmarkDate: '20.11.2026',
  salutation: 'Gửi bé iu của anh,',
  body: `Chúc mừng ngày 20/11 cô giáo nhỏ của anh nhé!

Anh biết công việc dạy các bạn nhỏ tự kỷ của bé iu vất vả lắm, nhiều lúc mệt mỏi và cần cực kỳ nhiều kiên nhẫn nữa. Nhưng mỗi lần nghe em kể chuyện trên lớp hay khoe các con hôm nay tiến bộ thêm một chút, anh thấy thương mà cũng tự hào về bé vô cùng.

Đi làm thì bé iu là cô giáo dịu dàng, kiên nhẫn với các con, nhưng về nhà thì cứ thoải mái nghỉ ngơi và thư giãn nha. Có mệt hay tủi thân gì thì cứ kể anh nghe, anh lúc nào cũng ở đây sẵn sàng nghe em chia sẻ. Mong rằng trong tương lai dù ra sao đi nữa, em vẫn được hạnh phúc và bình an trong cuộc sống, thuận lợi trong công việc của mình.

Chúc bé iu của anh một ngày 20/11 thật vui, lúc nào cũng khỏe mạnh, cười thật tươi và giữ mãi sự nhiệt huyết với nghề nhé. Thương em nhiều!`,
  theme: 'love',
  photos: [
    {
      src: './photos/photo-1.jpg',
      preset: 'sunset-walk',
      caption: 'Là bức ảnh đầu tiên anh lưu trong máy :>>>',
    },
    {
      src: './photos/photo-2.jpg',
      preset: 'starry-night',
      caption: 'Bức ảnh đi chơi du lịch cuối buổi của 2 đứa mình',
    },
  ],
};

export function encodeLetterToHash(letter) {
  const payload = {
    r: letter.recipient,
    s: letter.sender,
    d: letter.date,
    g: letter.salutation,
    b: letter.body,
    t: letter.theme,
    c0: letter.photos?.[0]?.caption || '',
    c1: letter.photos?.[1]?.caption || '',
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return '#letter=' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeLetterFromHash(hash) {
  if (!hash || !hash.startsWith('#letter=')) return null;
  try {
    let b64 = hash.slice('#letter='.length).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return {
      ...DEFAULT_LETTER,
      recipient: parsed.r || DEFAULT_LETTER.recipient,
      sender: parsed.s || DEFAULT_LETTER.sender,
      date: parsed.d || DEFAULT_LETTER.date,
      salutation: parsed.g || DEFAULT_LETTER.salutation,
      body: parsed.b || DEFAULT_LETTER.body,
      theme: THEMES[parsed.t] ? parsed.t : 'love',
      photos: [
        { ...DEFAULT_LETTER.photos[0], caption: parsed.c0 ?? DEFAULT_LETTER.photos[0].caption },
        { ...DEFAULT_LETTER.photos[1], caption: parsed.c1 ?? DEFAULT_LETTER.photos[1].caption },
      ],
    };
  } catch {
    return null;
  }
}
