export const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
	? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/`
	: "/api/images/";