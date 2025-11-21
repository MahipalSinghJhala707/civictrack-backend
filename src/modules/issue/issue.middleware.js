const multer = require("multer");
const path = require("path");

const MAX_IMAGES = Number(process.env.ISSUE_REPORT_MAX_IMAGES || 5);
const MAX_FILE_MB = Number(process.env.ISSUE_IMAGE_MAX_MB || 5);

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_MB * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidMime = allowedMimeTypes.includes(file.mimetype);
    const isValidExt = allowedExtensions.includes(ext);
    
    if (!isValidMime || !isValidExt) {
      const err = new Error("Only image uploads are allowed (JPG, PNG, GIF, WEBP).");
      err.statusCode = 400;
      return cb(err);
    }

    cb(null, true);
  }
});

const handleMulter = upload.array("images", MAX_IMAGES);

module.exports.uploadReportImages = (req, res, next) => {
  handleMulter(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        err = new Error(`Each image must be under ${MAX_FILE_MB}MB.`);
      }

      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        err = new Error(`Only up to ${MAX_IMAGES} images are allowed.`);
      }

      if (!err.statusCode) err.statusCode = 400;
      return next(err);
    }

    next();
  });
};
