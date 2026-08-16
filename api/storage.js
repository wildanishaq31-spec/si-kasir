import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.RUSTFS_ENDPOINT;
const accessKey = process.env.RUSTFS_ACCESS_KEY;
const secretKey = process.env.RUSTFS_SECRET_KEY;
const bucket = process.env.RUSTFS_BUCKET || 'si-kasir';

const s3 = new S3Client({
  region: 'us-east-1',
  endpoint,
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }

    const {
      action,
      fileName,
      contentType = 'application/octet-stream',
      folder = 'laporan-pendapatan',
    } = req.body || {};

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action wajib diisi',
      });
    }

    // =========================================================
    // GENERATE PRESIGNED UPLOAD URL
    // =========================================================
    if (action === 'upload') {
      if (!fileName) {
        return res.status(400).json({
          success: false,
          error: 'fileName wajib diisi',
        });
      }

      // Bersihkan nama file
      const cleanFileName = fileName
        .replace(/[^a-zA-Z0-9._-]/g, '_');

      const key = `${folder}/${Date.now()}_${cleanFileName}`;

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3, command, {
        expiresIn: 900, // 15 menit
      });

      return res.status(200).json({
        success: true,
        uploadUrl,
        key,
        bucket,
        expiresIn: 900,
      });
    }

    // =========================================================
    // GENERATE DOWNLOAD URL
    // =========================================================
    if (action === 'download') {
      const { key } = req.body;

      if (!key) {
        return res.status(400).json({
          success: false,
          error: 'key wajib diisi',
        });
      }

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const downloadUrl = await getSignedUrl(s3, command, {
        expiresIn: 900,
      });

      return res.status(200).json({
        success: true,
        downloadUrl,
        expiresIn: 900,
      });
    }

    // =========================================================
    // DELETE FILE
    // =========================================================
    if (action === 'delete') {
      const { key } = req.body;

      if (!key) {
        return res.status(400).json({
          success: false,
          error: 'key wajib diisi',
        });
      }

      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      return res.status(200).json({
        success: true,
        message: 'File berhasil dihapus',
        key,
      });
    }

    return res.status(400).json({
      success: false,
      error: `Action tidak dikenal: ${action}`,
    });

  } catch (error) {
    console.error('RustFS API Error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}