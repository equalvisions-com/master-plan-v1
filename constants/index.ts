export const ROUTES = {
  home: '/',
  category: (slug: string) => `/${slug}`,
  post: (categorySlug: string, postSlug: string) => `/${categorySlug}/${postSlug}`,
};

export const IMAGE_SIZES = {
  thumbnail: 384,
  featured: 1080,
  hero: 1920,
}; 