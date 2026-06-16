import express from 'express';
const router = express.Router();

// Apple Universal Links
router.get('/apple-app-site-association', (req, res) => {
  res.json({
    "applinks": {
      "apps": [],
      "details": [
        {
          "appID": "B9B3K45T5Y.com.mandaliapp.mandaliapp",
          "paths": ["/join/*"]
        }
      ]
    }
  });
});

// Android App Links
router.get('/assetlinks.json', (req, res) => {
  res.json([
    {
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "com.mandaliapp.mandali",
        "sha256_cert_fingerprints": [
          "YOUR_ANDROID_SHA256_FINGERPRINT"
        ]
      }
    }
  ]);
});

export default router;
