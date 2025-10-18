(() => {
  const root = document.getElementById("root");
  if (!root) {
    return;
  }

  if (root.classList.contains("active")) {
    root.textContent = "React bundle placeholder";
  }
})();
