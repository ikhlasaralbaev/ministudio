import type { AppDoc } from "./types";

/** Starter app — used as mock AI output (AI_MOCK=1) and as an example for the model. */
export function cafeTemplate(name = "Lazzat Kafe"): AppDoc {
  return {
    name,
    theme: { primary: "#e8590c", background: "#fff8f3", text: "#1f1410", radius: 16, font: "Inter, system-ui, sans-serif" },
    state: { cart: [], phone: "", address: "", orderId: "" },
    collections: [
      {
        name: "products",
        mode: "static",
        fields: [
          { name: "id", type: "string" },
          { name: "name", type: "string" },
          { name: "price", type: "number" },
          { name: "image", type: "string" },
          { name: "desc", type: "string" },
        ],
        data: [
          { id: "p1", name: "Osh", price: 38000, desc: "Toshkentcha to'y oshi", image: "https://images.unsplash.com/photo-1630409351241-e90e7f5e434d?w=800" },
          { id: "p2", name: "Lag'mon", price: 32000, desc: "Qo'lda cho'zilgan", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800" },
          { id: "p3", name: "Somsa", price: 9000, desc: "Tandirda pishgan", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800" },
          { id: "p4", name: "Shashlik", price: 22000, desc: "Mol go'shtidan, 1 six", image: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800" },
        ],
      },
      {
        name: "orders",
        mode: "records",
        fields: [
          { name: "items", type: "array" },
          { name: "total", type: "number" },
          { name: "phone", type: "string" },
          { name: "address", type: "string" },
        ],
      },
    ],
    screens: [
      {
        id: "scr_menu",
        type: "Screen",
        name: "Menyu",
        props: { title: "Menyu" },
        children: [
          {
            id: "row_header",
            type: "Row",
            style: { justifyContent: "space-between" },
            children: [
              {
                id: "box_head",
                type: "Box",
                style: { gap: 2 },
                children: [
                  { id: "txt_title", type: "Text", props: { text: name, variant: "h1" } },
                  { id: "txt_sub", type: "Text", props: { text: "Salom, {{ user.firstName }}! Nima buyurtma qilamiz?", variant: "caption" } },
                ],
              },
              {
                id: "row_cart_top",
                type: "Row",
                style: { background: "#e8590c1f", color: "#e8590c", borderRadius: 999, padding: "10px 14px", fontWeight: 700, gap: 8, transition: "all .15s" },
                events: { onClick: [{ type: "navigate", screen: "scr_cart" }] },
                children: [
                  { id: "ico_cart_top", type: "Icon", props: { name: "shopping-cart", size: 20, color: "#e8590c", weight: "fill" } },
                  { id: "txt_cart_count", type: "Text", props: { text: "{{ count(state.cart) }}" } },
                ],
              },
            ],
          },
          {
            id: "lst_products",
            type: "List",
            props: { source: "collections.products", emptyText: "Hozircha taomlar yo'q" },
            style: { gap: 12 },
            children: [
              {
                id: "box_card",
                type: "Box",
                style: { background: "#ffffff", borderRadius: 18, padding: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
                children: [
                  { id: "img_product", type: "Image", props: { src: "{{ item.image }}", alt: "{{ item.name }}", aspect: "16/9" }, style: { borderRadius: 12 } },
                  {
                    id: "row_card",
                    type: "Row",
                    style: { justifyContent: "space-between", padding: "4px 4px 2px" },
                    children: [
                      {
                        id: "box_card_text",
                        type: "Box",
                        style: { gap: 2 },
                        children: [
                          { id: "txt_name", type: "Text", props: { text: "{{ item.name }}", variant: "h3" } },
                          { id: "txt_price", type: "Text", props: { text: "{{ fmt(item.price) }} so'm", variant: "caption" } },
                        ],
                      },
                      {
                        id: "btn_add",
                        type: "Button",
                        props: { text: "+ Qo'shish" },
                        style: { padding: "10px 14px" },
                        events: {
                          onClick: [
                            { type: "append", key: "cart", value: "{ id: item.id, name: item.name, price: item.price }" },
                            { type: "haptic", style: "light" },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: "btn_checkout_bar",
            type: "Button",
            visibleIf: "count(state.cart) > 0",
            props: { text: "Savat · {{ fmt(sum(state.cart, 'price')) }} so'm" },
            style: { position: "sticky", bottom: 12, boxShadow: "0 8px 24px rgba(232,89,12,0.35)" },
            events: { onClick: [{ type: "navigate", screen: "scr_cart" }] },
          },
        ],
      },
      {
        id: "scr_cart",
        type: "Screen",
        name: "Savat",
        props: { title: "Savat" },
        children: [
          {
            id: "row_cart_head",
            type: "Row",
            children: [
              { id: "btn_back", type: "Button", props: { text: "←", variant: "ghost" }, style: { padding: "6px 10px" }, events: { onClick: [{ type: "back" }] } },
              { id: "txt_cart_title", type: "Text", props: { text: "Savat", variant: "h2" } },
            ],
          },
          {
            id: "lst_cart",
            type: "List",
            props: { source: "state.cart", emptyText: "Savat bo'sh" },
            children: [
              {
                id: "row_cart_item",
                type: "Row",
                style: { background: "#fff", borderRadius: 14, padding: "10px 12px", justifyContent: "space-between" },
                children: [
                  { id: "txt_ci_name", type: "Text", props: { text: "{{ item.name }}" }, style: { fontWeight: 600 } },
                  {
                    id: "row_ci_right",
                    type: "Row",
                    children: [
                      { id: "txt_ci_price", type: "Text", props: { text: "{{ fmt(item.price) }}", variant: "caption" } },
                      {
                        id: "box_ci_remove",
                        type: "Box",
                        style: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
                        events: { onClick: [{ type: "removeAt", key: "cart", index: "index" }] },
                        children: [{ id: "ico_ci_remove", type: "Icon", props: { name: "x", size: 18, color: "#868e96" } }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          { id: "inp_phone", type: "Input", props: { bind: "phone", placeholder: "Telefon raqam (+998...)", inputType: "tel" } },
          { id: "inp_address", type: "Input", props: { bind: "address", placeholder: "Manzil", multiline: true } },
          { id: "spc_1", type: "Spacer" },
          {
            id: "row_total",
            type: "Row",
            style: { justifyContent: "space-between" },
            children: [
              { id: "txt_total_l", type: "Text", props: { text: "Jami", variant: "h3" } },
              { id: "txt_total", type: "Text", props: { text: "{{ fmt(sum(state.cart, 'price')) }} so'm", variant: "h3" } },
            ],
          },
          {
            id: "btn_order",
            type: "Button",
            props: { text: "Buyurtma berish" },
            style: { padding: "15px 16px" },
            events: {
              onClick: [
                {
                  type: "if",
                  cond: "count(state.cart) == 0 || len(state.phone) < 9",
                  then: [
                    { type: "haptic", style: "error" },
                    { type: "alert", text: "Savatga taom qo'shing va telefon raqamni kiriting" },
                  ],
                  else: [
                    {
                      type: "dbInsert",
                      collection: "orders",
                      value: "{ items: state.cart, total: sum(state.cart, 'price'), phone: state.phone, address: state.address, user: user }",
                      saveIdTo: "orderId",
                    },
                    {
                      type: "notifyOwner",
                      text: "🆕 Buyurtma #{{ last }}\n{{ join(map(state.cart, 'name')) }}\nJami: {{ fmt(sum(state.cart, 'price')) }} so'm\nTel: {{ state.phone }}\nManzil: {{ state.address }}",
                    },
                    { type: "haptic", style: "success" },
                    { type: "navigate", screen: "scr_done" },
                    { type: "setState", key: "cart", value: "[]" },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        id: "scr_done",
        type: "Screen",
        name: "Tayyor",
        style: { justifyContent: "center", alignItems: "center", textAlign: "center" },
        children: [
          { id: "ico_done", type: "Icon", props: { name: "check-circle", size: 72, color: "#2f9e44", weight: "fill" } },
          { id: "txt_done", type: "Text", props: { text: "Rahmat! Buyurtmangiz qabul qilindi", variant: "h2" } },
          { id: "txt_done_sub", type: "Text", props: { text: "Buyurtma raqami: {{ state.orderId }}", variant: "caption" } },
          { id: "btn_done_menu", type: "Button", props: { text: "Menyuga qaytish", variant: "secondary" }, events: { onClick: [{ type: "navigate", screen: "scr_menu" }] } },
        ],
      },
    ],
    bot: { welcomeText: "Assalomu alaykum! Lazzat Kafe menyusini ochish uchun pastdagi tugmani bosing 👇", buttonText: "🍽 Menyu",
      messages: [{ id: "menyu", text: "Lazzat Kafe menyusi 👇", buttons: [[{ text: "🍽 Menyuni ochish", app: true }]] }],
      commands: [{ command: "menu", description: "Menyuni ochish", to: "menyu" }],
      keywords: [{ match: "menyu", to: "menyu" }],
      ownerAlerts: [{ collection: "orders", acceptText: "✅ Buyurtmangiz qabul qilindi, tayyorlanmoqda.", rejectText: "❌ Kechirasiz, buyurtmani qabul qila olmaymiz." }],
    },
  };
}
