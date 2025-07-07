// 前端指纹生成（public/js/fingerprint.js）
import FingerprintJS from '@fingerprintjs/fingerprintjs';
const fp = await FingerprintJS.load();
const result = await fp.get();
localStorage.setItem('deviceFingerprint', result.visitorId);
