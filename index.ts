// ponytail: keep the star re-export here; Bun bundles this entry correctly,
// while explicit named re-exports can emit a broken dist stub.
export * from "./src/index";
