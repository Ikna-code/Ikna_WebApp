export const imageService = {
  /**
   * Returns the correct path for a product image.
   * Centralizing this makes it easy to move from local storage to a Cloud Bucket later.
   */
  getProductImageUrl: (imageName: string) => {
    if (imageName.startsWith('http')) return imageName;
    return `/images/products/${imageName}`;
  }
};