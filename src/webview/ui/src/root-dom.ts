export const activateRoot = () => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.classList.add("active");
  }
};
