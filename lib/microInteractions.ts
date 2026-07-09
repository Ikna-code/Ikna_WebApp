export function animateFlyToCartFromElement(sourceEl: HTMLElement | null) {
  if (typeof window === "undefined" || !sourceEl) return;

  const sourceRect = sourceEl.getBoundingClientRect();
  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;

  const cartAnchor = document.querySelector('[data-cart-anchor="true"]') as HTMLElement | null;
  const targetRect = cartAnchor?.getBoundingClientRect();

  const targetCenterX = targetRect
    ? targetRect.left + targetRect.width / 2
    : window.innerWidth - 24;
  const targetCenterY = targetRect
    ? targetRect.top + targetRect.height / 2
    : 24;

  const flyNode = document.createElement("div");
  flyNode.setAttribute("aria-hidden", "true");
  flyNode.style.position = "fixed";
  flyNode.style.left = `${sourceCenterX - 10}px`;
  flyNode.style.top = `${sourceCenterY - 10}px`;
  flyNode.style.width = "20px";
  flyNode.style.height = "20px";
  flyNode.style.borderRadius = "9999px";
  flyNode.style.background = "radial-gradient(circle at 30% 30%, #f7d2e7 0%, #b1106f 55%, #7c0d4f 100%)";
  flyNode.style.boxShadow = "0 8px 24px rgba(132,13,92,0.35)";
  flyNode.style.pointerEvents = "none";
  flyNode.style.zIndex = "9999";
  flyNode.style.opacity = "0.95";
  flyNode.style.transform = "translate3d(0,0,0) scale(1)";
  flyNode.style.transition = "transform 650ms cubic-bezier(0.2, 0.85, 0.2, 1), opacity 650ms ease";

  document.body.appendChild(flyNode);

  requestAnimationFrame(() => {
    const deltaX = targetCenterX - sourceCenterX;
    const deltaY = targetCenterY - sourceCenterY;

    flyNode.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.25)`;
    flyNode.style.opacity = "0.1";
  });

  const cleanup = () => {
    if (flyNode.parentNode) {
      flyNode.parentNode.removeChild(flyNode);
    }
  };

  flyNode.addEventListener("transitionend", cleanup, { once: true });
  window.setTimeout(cleanup, 900);
}
