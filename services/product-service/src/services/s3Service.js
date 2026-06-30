const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

let s3Client = null;
const bucketName = process.env.S3_BUCKET_NAME || 'shopnow-images';

const initS3 = () => {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  } else if (process.env.MINIO_ENDPOINT) {
    // Local MinIO setup
    s3Client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT, // e.g. http://localhost:9000
      forcePathStyle: true,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin',
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadminpassword'
      }
    });
  } else {
    console.warn('S3/MinIO configurations not found. Using S3 pre-signed URL mock.');
  }
};

const getPresignedUploadUrl = async (fileName, fileType) => {
  if (!s3Client) {
    initS3();
  }

  const fileExtension = fileName.split('.').pop();
  const key = `${uuidv4()}.${fileExtension}`;

  if (!s3Client) {
    // Return mock url for local sandbox execution
    return {
      uploadUrl: `http://localhost:8082/mock-upload/${key}`,
      imageUrl: `http://localhost:9000/${bucketName}/${key}`,
      key
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType
    });
    
    // URL expires in 15 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    const imageUrl = process.env.MINIO_ENDPOINT 
      ? `${process.env.MINIO_ENDPOINT}/${bucketName}/${key}`
      : `https://${bucketName}.s3.amazonaws.com/${key}`;

    return {
      uploadUrl,
      imageUrl,
      key
    };
  } catch (error) {
    console.error('Error generating pre-signed S3 URL', error.message);
    throw error;
  }
};

module.exports = {
  getPresignedUploadUrl
};
