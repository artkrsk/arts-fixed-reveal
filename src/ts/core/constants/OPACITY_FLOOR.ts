/**
 * Minimum opacity the footer is allowed to fade from. Animating opacity
 * to exactly 0 makes some browsers detach the element from the compositor
 * (since "invisible = skip paint" is a valid optimization). The 0 ↔ >0
 * boundary crossing then forces a relayer / re-rasterize on the first
 * frame of the reveal — visible as a hitch when the footer subtree is
 * heavy (mixed transformed children, canvases, blurred backgrounds, etc.).
 *
 * Clamping to a small epsilon keeps the element in the compositor tree
 * throughout the tween. 0.01 is below human contrast detection threshold
 * on any background, so visually identical to 0.
 */
export const OPACITY_FLOOR = 0.01
