const multer = require("multer");

const MAX_IMAGES = Number(process.env.ISSUE_REPORT_MAX_IMAGES || 5);
const MAX_FILE_MB = Number(process.env.ISSUE_IMAGE_MAX_MB || 5);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_MB * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      const err = new Error("Only image uploads are allowed.");
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
