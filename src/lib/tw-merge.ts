/**
 * Re-export tailwind-merge with a stable name so we control the bundler
 * behavior. We deliberately keep this thin so consumers can swap their
 * own version if they prefer a different tw-merge fork (e.g. the
 * tailwind-variants one used by shadcn-vue).
 */
export { twMerge } from "tailwind-merge";
export { default as twMergeDefault } from "tailwind-merge";