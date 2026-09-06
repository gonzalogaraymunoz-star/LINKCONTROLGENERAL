"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PersonalMissionMenuLink() {
  const router = useRouter();

  useEffect(() => {
    const menu = document.querySelector(".cc-menu");
    if (!menu || menu.querySelector("[data-personal-mission-link]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-personal-mission-link", "true");
    button.innerHTML = "<span>◉</span><b>Misión Personal</b>";
    button.addEventListener("click", () => router.push("/mision-personal"));

    const integration = Array.from(menu.querySelectorAll("button")).find((el) =>
      el.textContent?.includes("Integraciones")
    );

    if (integration) integration.insertAdjacentElement("afterend", button);
    else menu.appendChild(button);

    return () => button.remove();
  }, [router]);

  return null;
}
