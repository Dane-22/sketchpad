"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const convertController_1 = require("../controllers/convertController");
const router = (0, express_1.Router)();
const path_1 = __importDefault(require("path"));
// Setup multer to store uploaded files in the local tmp directory
const tmpDir = path_1.default.join(__dirname, '..', '..', 'tmp');
const upload = (0, multer_1.default)({
    dest: tmpDir,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
router.post('/convert', upload.single('file'), convertController_1.uploadAndConvert);
exports.default = router;
