/** Type declaration for CSS module imports. */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
