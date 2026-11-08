import type { AppDoc } from "./types";

/** Barbershop booking: pick a service, a time and leave a phone number. */
export function barberTemplate(name = "Ustara Barber"): AppDoc {
  return {
    name,
    theme: { primary: "#d6a35c", background: "#121212", text: "#f2efe9", radius: 14, font: "Inter, system-ui, sans-serif" },
    state: { service: "", price: 0, time: "", phone: "" },
    collections: [
      {
        name: "services",
        mode: "static",
        fields: [
          { name: "id", type: "string" },
          { name: "name", type: "string" },
          { name: "price", type: "number" },
          { name: "min", type: "number" },
        ],
        data: [
          { id: "s1", name: "Soch olish", price: 60000, min: 40 },
          { id: "s2", name: "Soqol dizayni", price: 40000, min: 25 },
          { id: "s3", name: "Soch va soqol", price: 90000, min: 60 },
          { id: "s4", name: "Bolalar soch olish", price: 45000, min: 30 },
        ],
      },
      {
        name: "bookings",
        mode: "records",
        fields: [
          { name: "service", type: "string" },
          { name: "time", type: "string" },
          { name: "phone", type: "string" },
        ],
      },
    ],
    screens: [
      {
        id: "scr_services",
        type: "Screen",
        name: "Xizmatlar",
        style: { gap: 14 },
        children: [
          { id: "txt_h", type: "Text", props: { text: name, variant: "h1" } },
          { id: "txt_s", type: "Text", props: { text: "Xizmatni tanlang, vaqtni band qiling", variant: "caption" } },
          {
            id: "lst_srv",
            type: "List",
            props: { source: "collections.services" },
            style: { gap: 10 },
            children: [
              {
                id: "row_srv",
                type: "Row",
                style: {
                  justifyContent: "space-between",
                  padding: 14,
                  borderRadius: 14,
                  background: "{{ state.service == item.name ? '#d6a35c22' : '#1c1c1c' }}",
                  border: "{{ state.service == item.name ? '1px solid #d6a35c' : '1px solid #262626' }}",
                },
                events: {
                  onClick: [
                    { type: "setState", key: "service", value: "item.name" },
                    { type: "setState", key: "price", value: "item.price" },
                    { type: "haptic", style: "light" },
                  ],
                },
                children: [
                  {
                    id: "box_srv",
                    type: "Box",
                    style: { gap: 2 },
                    children: [
                      { id: "txt_srv", type: "Text", props: { text: "{{ item.name }}", variant: "h3" } },
                      { id: "txt_min", type: "Text", props: { text: "{{ item.min }} daqiqa", variant: "caption" } },
                    ],
                  },
                  { id: "txt_pr", type: "Text", props: { text: "{{ fmt(item.price) }}" }, style: { fontWeight: 700, color: "#d6a35c" } },
                ],
              },
            ],
          },
          {
            id: "btn_next",
            type: "Button",
            visibleIf: "!empty(state.service)",
            props: { text: "Vaqtni tanlash" },
            style: { position: "sticky", bottom: 12, color: "#121212" },
            events: { onClick: [{ type: "navigate", screen: "scr_time" }] },
          },
        ],
      },
      {
        id: "scr_time",
        type: "Screen",
        name: "Vaqt",
        style: { gap: 14 },
        children: [
          {
            id: "row_back",
            type: "Row",
            children: [
              { id: "btn_back", type: "Button", props: { text: "Orqaga", variant: "ghost" }, events: { onClick: [{ type: "back" }] } },
              { id: "txt_t", type: "Text", props: { text: "{{ state.service }}", variant: "h2" } },
            ],
          },
          { id: "txt_day", type: "Text", props: { text: "Bugun, bo‘sh vaqtlar", variant: "caption" } },
          {
            id: "lst_time",
            type: "List",
            props: { source: "['10:00', '11:30', '13:00', '15:30', '17:00', '18:30']" },
            style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
            children: [
              {
                id: "btn_slot",
                type: "Button",
                props: { text: "{{ item }}", variant: "secondary" },
                style: {
                  background: "{{ state.time == item ? '#d6a35c' : '#1c1c1c' }}",
                  color: "{{ state.time == item ? '#121212' : '#f2efe9' }}",
                },
                events: { onClick: [{ type: "setState", key: "time", value: "item" }, { type: "haptic", style: "light" }] },
              },
            ],
          },
          { id: "inp_phone", type: "Input", props: { bind: "phone", placeholder: "Telefon raqam", inputType: "tel" } },
          { id: "spc", type: "Spacer" },
          {
            id: "btn_book",
            type: "Button",
            props: { text: "Band qilish · {{ fmt(state.price) }} so‘m" },
            style: { color: "#121212" },
            events: {
              onClick: [
                {
                  type: "if",
                  cond: "empty(state.time) || len(state.phone) < 9",
                  then: [{ type: "alert", text: "Vaqt va telefon raqamni kiriting" }],
                  else: [
                    { type: "dbInsert", collection: "bookings", value: "{ service: state.service, time: state.time, phone: state.phone }" },
                    { type: "haptic", style: "success" },
                    { type: "alert", text: "Siz {{ state.time }} ga yozildingiz" },
                    { type: "navigate", screen: "scr_services" },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
    bot: {
      welcomeText: "Assalomu alaykum! Yozilish uchun tugmani bosing.",
      buttonText: "Yozilish",
      messages: [{ id: "yozilish", text: "Xizmat, usta va vaqtni tanlang 👇", buttons: [[{ text: "Yozilish", app: true }]] }],
      commands: [{ command: "yozilish", description: "Yozilish", to: "yozilish" }],
      ownerAlerts: [{ collection: "bookings", acceptText: "✅ Yozilishingiz tasdiqlandi. Kutamiz!", rejectText: "❌ Bu vaqt band. Boshqa vaqtni tanlang." }],
    },
  };
}

/** Tutoring center: course catalog and a sign-up form. */
export function courseTemplate(name = "Bilim Markazi"): AppDoc {
  return {
    name,
    theme: { primary: "#2f6fed", background: "#f5f7fb", text: "#14161c", radius: 16, font: "Inter, system-ui, sans-serif" },
    state: { course: "", fullName: "", phone: "" },
    collections: [
      {
        name: "courses",
        mode: "static",
        fields: [
          { name: "id", type: "string" },
          { name: "name", type: "string" },
          { name: "level", type: "string" },
          { name: "months", type: "number" },
          { name: "price", type: "number" },
        ],
        data: [
          { id: "c1", name: "Ingliz tili IELTS", level: "B1 dan", months: 4, price: 650000 },
          { id: "c2", name: "Matematika DTM", level: "Abituriyent", months: 6, price: 480000 },
          { id: "c3", name: "Python dasturlash", level: "Boshlang‘ich", months: 3, price: 720000 },
          { id: "c4", name: "Rus tili", level: "A2 dan", months: 4, price: 420000 },
        ],
      },
      {
        name: "applications",
        mode: "records",
        fields: [
          { name: "course", type: "string" },
          { name: "fullName", type: "string" },
          { name: "phone", type: "string" },
        ],
      },
    ],
    screens: [
      {
        id: "scr_courses",
        type: "Screen",
        name: "Kurslar",
        style: { gap: 14 },
        children: [
          { id: "txt_h", type: "Text", props: { text: name, variant: "h1" } },
          { id: "txt_s", type: "Text", props: { text: "Yangi guruhlar shu oydan boshlanadi", variant: "caption" } },
          {
            id: "lst_c",
            type: "List",
            props: { source: "collections.courses" },
            style: { gap: 10 },
            children: [
              {
                id: "box_c",
                type: "Box",
                style: { background: "#ffffff", borderRadius: 16, padding: 14, gap: 8, boxShadow: "0 1px 2px rgba(20,22,28,.05), 0 6px 18px rgba(20,22,28,.06)" },
                children: [
                  {
                    id: "row_c",
                    type: "Row",
                    style: { justifyContent: "space-between" },
                    children: [
                      { id: "txt_cn", type: "Text", props: { text: "{{ item.name }}", variant: "h3" } },
                      { id: "bdg_lv", type: "Badge", props: { text: "{{ item.level }}" } },
                    ],
                  },
                  {
                    id: "row_c2",
                    type: "Row",
                    style: { justifyContent: "space-between" },
                    children: [
                      { id: "txt_m", type: "Text", props: { text: "{{ item.months }} oy · {{ fmt(item.price) }} so‘m/oy", variant: "caption" } },
                      {
                        id: "btn_apply",
                        type: "Button",
                        props: { text: "Yozilish" },
                        style: { padding: "8px 14px" },
                        events: { onClick: [{ type: "setState", key: "course", value: "item.name" }, { type: "navigate", screen: "scr_form" }] },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "scr_form",
        type: "Screen",
        name: "Ariza",
        style: { gap: 14 },
        children: [
          { id: "btn_back", type: "Button", props: { text: "Orqaga", variant: "ghost" }, style: { alignSelf: "flex-start" }, events: { onClick: [{ type: "back" }] } },
          { id: "txt_f", type: "Text", props: { text: "{{ state.course }}", variant: "h2" } },
          { id: "txt_fs", type: "Text", props: { text: "Ma’lumotlaringizni qoldiring, administrator qo‘ng‘iroq qiladi", variant: "caption" } },
          { id: "inp_name", type: "Input", props: { bind: "fullName", placeholder: "Ism familiya" } },
          { id: "inp_phone", type: "Input", props: { bind: "phone", placeholder: "Telefon raqam", inputType: "tel" } },
          { id: "spc", type: "Spacer" },
          {
            id: "btn_send",
            type: "Button",
            props: { text: "Ariza yuborish" },
            events: {
              onClick: [
                {
                  type: "if",
                  cond: "empty(state.fullName) || len(state.phone) < 9",
                  then: [{ type: "alert", text: "Ism va telefon raqamni kiriting" }],
                  else: [
                    { type: "dbInsert", collection: "applications", value: "{ course: state.course, fullName: state.fullName, phone: state.phone }" },
                    { type: "haptic", style: "success" },
                    { type: "alert", text: "Arizangiz qabul qilindi" },
                    { type: "navigate", screen: "scr_courses" },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
    bot: {
      welcomeText: "Assalomu alaykum! Kurslarni ko‘rish uchun tugmani bosing.",
      buttonText: "Kurslar",
      messages: [{ id: "kurslar", text: "Kurslar katalogi 👇", buttons: [[{ text: "Kurslarni ko‘rish", app: true }]] }],
      commands: [{ command: "kurslar", description: "Kurslar katalogi", to: "kurslar" }],
      keywords: [{ match: "kurs", to: "kurslar" }],
      ownerAlerts: [{ collection: "applications", acceptText: "✅ Arizangiz qabul qilindi, tez orada bog‘lanamiz.", rejectText: "❌ Afsuski, hozir joy qolmagan." }],
    },
  };
}
