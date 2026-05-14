    const CARTOON_KEY = "y2k-cartoons-v2";
    const CARTOON_MAX_FILE = Math.floor(1.5 * 1024 * 1024);
    const CARTOON_MAX_SLOTS = 14;

    let builtinCartoonSnapshot = null;
    let cartoonData = { left: [], right: [], header: [] };
    let cartoonPick = null;

    function sanitizeSvg(s) {
      return String(s || "")
        .replace(/<script\b[\s\S]*?<\/script>/gi, "")
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    }

    function readBuiltinsFromEl(el) {
      if (!el) return { left: [], right: [], header: [] };
      function pack(zone) {
        const z = el.querySelector('[data-zone="' + zone + '"]');
        if (!z) return [];
        return Array.from(z.children).map(function (node, i) {
          return { id: "b-" + zone + "-" + i, type: "svg", svg: node.outerHTML };
        });
      }
      return { left: pack("left"), right: pack("right"), header: pack("header") };
    }

    function loadCartoons() {
      try {
        const raw = localStorage.getItem(CARTOON_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || !Array.isArray(o.left) || !Array.isArray(o.right) || !Array.isArray(o.header)) return null;
        function clean(arr) {
          return (arr || [])
            .map(function (item) {
              if (!item || typeof item.id !== "string") return null;
              if (item.type === "img" && typeof item.src === "string" && /^data:|^https?:\/\//i.test(item.src))
                return { id: item.id, type: "img", src: item.src };
              if (item.type === "svg" && typeof item.svg === "string" && /<svg/i.test(item.svg))
                return { id: item.id, type: "svg", svg: sanitizeSvg(item.svg) };
              return null;
            })
            .filter(Boolean);
        }
        return { left: clean(o.left), right: clean(o.right), header: clean(o.header) };
      } catch {
        return null;
      }
    }

    function saveCartoons() {
      try {
        localStorage.setItem(CARTOON_KEY, JSON.stringify(cartoonData));
      } catch {
        showStatus("Could not save cartoons (storage may be full).", false);
      }
    }

    function createCartoonEl(item) {
      if (!item) return document.createComment("");
      if (item.type === "img" && item.src) {
        const img = document.createElement("img");
        img.src = item.src;
        img.alt = "";
        img.className = "cartoon-user-img";
        return img;
      }
      const wrap = document.createElement("div");
      wrap.innerHTML = sanitizeSvg(item.svg || "");
      return wrap.firstElementChild || wrap;
    }

    function mountCartoons() {
      const L = document.getElementById("cartoonMountLeft");
      const R = document.getElementById("cartoonMountRight");
      const H = document.getElementById("cartoonMountHeader");
      [L, R, H].forEach(function (m) {
        if (m) m.innerHTML = "";
      });
      (cartoonData.left || []).forEach(function (it) {
        if (L) L.appendChild(createCartoonEl(it));
      });
      (cartoonData.right || []).forEach(function (it) {
        if (R) R.appendChild(createCartoonEl(it));
      });
      (cartoonData.header || []).forEach(function (it) {
        if (H) H.appendChild(createCartoonEl(it));
      });
    }

    function moveCartoon(zone, id, delta) {
      const arr = cartoonData[zone];
      const i = arr.findIndex(function (x) {
        return x.id === id;
      });
      if (i < 0) return;
      const j = i + delta;
      if (j < 0 || j >= arr.length) return;
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
      saveCartoons();
      mountCartoons();
      renderCartoonEditor();
    }

    function replaceCartoon(zone, id, file, result) {
      const arr = cartoonData[zone];
      const i = arr.findIndex(function (x) {
        return x.id === id;
      });
      if (i < 0) return;
      const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
      if (isSvg) {
        arr[i] = { id: id, type: "svg", svg: sanitizeSvg(String(result)) };
      } else {
        arr[i] = { id: id, type: "img", src: String(result) };
      }
    }

    function pushCartoonFromResult(zone, file, result) {
      const id = "c-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
      if (isSvg) cartoonData[zone].push({ id: id, type: "svg", svg: sanitizeSvg(String(result)) });
      else cartoonData[zone].push({ id: id, type: "img", src: String(result) });
    }

    function cartoonEditorRow(zone, item, index) {
      const row = document.createElement("div");
      row.className = "cartoon-row";
      const el = createCartoonEl(item);
      const thumb = document.createElement("div");
      thumb.className = "cartoon-thumb";
      const clone = el.cloneNode(true);
      thumb.appendChild(clone);
      const actions = document.createElement("div");
      actions.className = "cartoon-row-actions";
      const rep = document.createElement("button");
      rep.type = "button";
      rep.className = "btn-mini";
      rep.textContent = "Replace…";
      rep.dataset.cartoonReplace = zone + "|" + item.id;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn-mini danger";
      del.textContent = "Delete";
      del.dataset.cartoonDelete = zone + "|" + item.id;
      const up = document.createElement("button");
      up.type = "button";
      up.className = "btn-mini";
      up.textContent = "Up";
      up.dataset.cartoonUp = zone + "|" + item.id;
      up.disabled = index === 0;
      const dn = document.createElement("button");
      dn.type = "button";
      dn.className = "btn-mini";
      dn.textContent = "Down";
      dn.dataset.cartoonDown = zone + "|" + item.id;
      dn.disabled = index >= cartoonData[zone].length - 1;
      actions.append(rep, up, dn, del);
      row.append(thumb, actions);
      return row;
    }

    function renderCartoonEditor() {
      const root = document.getElementById("cartoonEditorZones");
      if (!root) return;
      root.innerHTML = "";
      [
        { key: "left", title: "Left column (wide screens)" },
        { key: "right", title: "Right column" },
        { key: "header", title: "Header mini strip" },
      ].forEach(function (z) {
        const block = document.createElement("section");
        block.className = "cartoon-zone-block";
        const h = document.createElement("h4");
        h.className = "cartoon-zone-title";
        h.textContent = z.title;
        block.appendChild(h);
        (cartoonData[z.key] || []).forEach(function (item, idx) {
          block.appendChild(cartoonEditorRow(z.key, item, idx));
        });
        const addBar = document.createElement("div");
        addBar.className = "cartoon-add-bar";
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "btn-3d secondary";
        addBtn.textContent = "Add picture…";
        addBtn.dataset.cartoonAdd = z.key;
        addBar.appendChild(addBtn);
        block.appendChild(addBar);
        root.appendChild(block);
      });
    }

    function wireCartoonUi() {
      const root = document.getElementById("cartoonEditorZones");
      const file = document.getElementById("cartoonFile");
      const reset = document.getElementById("cartoonResetBtn");
      if (!root || !file || root.dataset.wired === "1") return;
      root.dataset.wired = "1";

      root.addEventListener("click", function (e) {
        const t = e.target.closest("button");
        if (!t) return;
        if (t.dataset.cartoonAdd) {
          cartoonPick = { op: "add", zone: t.dataset.cartoonAdd };
          file.value = "";
          file.click();
        } else if (t.dataset.cartoonReplace) {
          const p = t.dataset.cartoonReplace.split("|");
          cartoonPick = { op: "replace", zone: p[0], id: p[1] };
          file.value = "";
          file.click();
        } else if (t.dataset.cartoonDelete) {
          const p = t.dataset.cartoonDelete.split("|");
          cartoonData[p[0]] = cartoonData[p[0]].filter(function (x) {
            return x.id !== p[1];
          });
          saveCartoons();
          mountCartoons();
          renderCartoonEditor();
        } else if (t.dataset.cartoonUp) {
          const p = t.dataset.cartoonUp.split("|");
          moveCartoon(p[0], p[1], -1);
        } else if (t.dataset.cartoonDown) {
          const p = t.dataset.cartoonDown.split("|");
          moveCartoon(p[0], p[1], 1);
        }
      });

      file.addEventListener("change", function () {
        const f = file.files && file.files[0];
        if (!f || !cartoonPick) {
          file.value = "";
          return;
        }
        if (f.size > CARTOON_MAX_FILE) {
          showStatus("Picture too large (about 1.5 MB max).", false);
          file.value = "";
          cartoonPick = null;
          return;
        }
        const reader = new FileReader();
        reader.onload = function () {
          if (cartoonPick.op === "add") {
            if ((cartoonData[cartoonPick.zone] || []).length >= CARTOON_MAX_SLOTS) {
              showStatus("Maximum " + CARTOON_MAX_SLOTS + " pictures per area.", false);
            } else {
              pushCartoonFromResult(cartoonPick.zone, f, reader.result);
            }
          } else if (cartoonPick.op === "replace") {
            replaceCartoon(cartoonPick.zone, cartoonPick.id, f, reader.result);
          }
          cartoonPick = null;
          file.value = "";
          saveCartoons();
          mountCartoons();
          renderCartoonEditor();
          showStatus("Cartoons updated ✓", true);
        };
        reader.onerror = function () {
          showStatus("Could not read that file.", false);
          cartoonPick = null;
          file.value = "";
        };
        if (f.type === "image/svg+xml" || /\.svg$/i.test(f.name)) reader.readAsText(f);
        else reader.readAsDataURL(f);
      });

      if (reset) {
        reset.addEventListener("click", function () {
          cartoonData = JSON.parse(JSON.stringify(builtinCartoonSnapshot || { left: [], right: [], header: [] }));
          saveCartoons();
          mountCartoons();
          renderCartoonEditor();
          showStatus("Cartoons reset to built‑in drawings.", true);
        });
      }
    }

    function initCartoons() {
      const src = document.getElementById("cartoon-default-source");
      builtinCartoonSnapshot = readBuiltinsFromEl(src);
      const saved = loadCartoons();
      cartoonData = saved || JSON.parse(JSON.stringify(builtinCartoonSnapshot));
      if (src) src.remove();
      mountCartoons();
      renderCartoonEditor();
      wireCartoonUi();
    }
