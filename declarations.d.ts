declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.css';

// Third-party packages that ship no type definitions. Keep these minimal;
// prefer installing @types/* when a package gains community typings.
declare module 'simpl-schema';
declare module 'react-image-file-resizer';
declare module 'fslightbox-react';
declare module 'html-truncate';
