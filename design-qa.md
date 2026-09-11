# Fidelity pass 15 — Explore flow header parity (2026-09-11)

- Source comparison: user captures `codex-clipboard-9Pno0F.png` (Idea) and `codex-clipboard-pyokZY.png` (Diagnosis), with Diagnosis selected as the geometry standard.
- Implementation evidence: `electron/.tmp/explore-idea-workspace-target-1448x1086.png` and `electron/.tmp/explore-diagnosis-workspace-target-1448x1086.png`.
- Focused same-viewport comparison: `electron/.tmp/phase15-pass15-flow-header-parity.png`; both captures use a 1448 × 1086 CSS viewport and are stacked without scaling.
- [P1 fixed] Idea previously used a different header height, column ratio, back-button size/offset, title spacing, subtitle width, and stage-step geometry.
- [P1 fixed] The Idea draft badge used an obsolete absolute position and could escape beneath the back button; draft state is now hidden consistently on both initial flow screens.
- Both flows now share a 132px header, 48px back control, identical copy baseline, 31/69 header grid, 62px stage cards, and matching responsive breakpoints.
- Automated checks validate the header/copy boundaries, back-button containment, hidden draft badge, stage descriptions, responsive layout matrix, full handoff flow, and zero console errors.

No actionable P0/P1/P2 findings remain for this correction.

final result: passed

# Phase 15 Visual QA — fidelity pass 2

日期：2026-09-11

## 验证对象

- 总体视觉真相：`C:\Users\20917\AppData\Local\Temp\codex-clipboard-LMxWIm.png`
- 真实旧页面：`C:\Users\20917\AppData\Local\Temp\codex-clipboard-ebdpqy.png`
- 第二轮局部真相：`codex-clipboard-58wGhG.png`、`iz0rJ0.png`、`k9i5ro.png`、`3uGbOg.png`、`Ja58lU.png`、`kQI9xb.png`、`tZJcm1.png`。
- 顶部独立栏真相：`C:\Users\20917\AppData\Local\Temp\codex-clipboard-JXPylP.png`
- 最终实现截图：`electron/.tmp/explore-entry-target-1536x1024.png`
- 第二轮同视口并排图：`electron/.tmp/phase15-v2-comparison.png`
- 参考与实现均为 1536 × 1024，device scale 1；并排图左侧为参考，右侧为实现。

## 数据与功能边界

- 参考中的历史标题、日期、知识项和工程文件只是布局样例，成品继续读取真实会话、Explore 历史、本地知识和当前工程摘要；空数据展示诚实空态。
- 六个工作区、工程选择、设置、Agent composer、Explore 双入口和四阶段确认门禁均连接原有真实处理逻辑。
- 本轮没有执行真实搜索、模型改码、Build/Flash/Serial 或硬件验证；`REAL_HARDWARE_VALIDATION_PENDING`。

## 同屏评审与修复

### Iteration 1

- P1：旧导航属于右侧 BrowserPanel，无法形成参考图中的全宽独立行。修复为 React portal 全局层，品牌、六标签、工程选择、设置成为单一首行。
- P1：1536 宽度下设置按钮因旧八列网格进入第二行。修复为九列显式网格、收紧固有宽度，并增加同排/左右顺序/视口覆盖几何门禁。
- P1：Explore 入口插画选择器误命中正文宽度规则，产生文字与插画重叠。排除插画节点，并将插画宽度收敛至 49%；八组宽度均验证正文不重叠。
- P2：历史夜景角色和 Agent 欢迎角色在实际槽位偏小。重新生成适配纵向侧栏与透明欢迎区的位图，并调整实际显示比例。

### Iteration 2

- 顶部栏：1536 × 1024 下 `nav=[8,1528,8,58]`，品牌、首标签、Skill 标签、工程选择和设置均在同一行；设置右边界 1520，未出视口。
- Agent：举星星学院呱呱、四张带独立图标的快捷卡和四条建议均完整可见；快捷卡可写入真实 composer。
- Explore：Hero 文字直接落在通栏学院背景上；知乎连接状态放大；紫/青入口提高卡高、完整展示角色并补充四个语义标签。
- 下方信息：历史跨双列，知识库与当前工程并排；内容为空或不足时不伪造参考数据。
- 图像：新位图按槽位使用 `cover` / `contain`，无拉伸、无低清 sprite 裁切；功能图标使用 `lucide-react`。

## 自动门禁

- Agent：4 个快捷卡、4 条建议、4 个历史轨操作，第一快捷卡正确注入“当前工程”提示。
- 顶部栏：品牌在标签前，工程在 Skill 标签后，设置在工程后，所有元素同排且横跨视口。
- Explore：8 组宽度/分栏场景通过；入口插画加载、右侧锚定且正文无重叠。
- Explore 流程：证据、来源分歧、四阶段、Handoff 材料、确认门禁、返回与工作区切换状态均保留。
- Renderer 控制台错误为 0；Windows Headless Chromium 退出后的临时 profile `EPERM` 为最佳努力清理提示，脚本退出码为 0。

## 接受的 P3 偏差

- 参考图中的虚构历史、知识和工程文件不写入产品，真实数据为空时密度较低。
- 顶部保留 Electron 自己的原生窗口 chrome；应用内容栏不伪造系统最小化、最大化和关闭按钮。
- 悬浮学院呱呱继续尊重用户可拖动并持久化的位置，可能覆盖当前工程摘要的一小部分。

P0/P1/P2 已清零；保留差异均来自真实性、系统窗口边界或既有用户偏好。

final result: passed

## Fidelity pass 14 — 2026-09-11

- Source correction: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-cWH19E.png` and focused crop `codex-clipboard-UCcLzw.png` showed a missing back control, header copy crossing the border, and the draft status escaping below the header.
- Post-fix implementation: `electron/.tmp/explore-diagnosis-workspace-target-1448x1086.png` at 1448 × 1086, dark Diagnosis describe state.
- [P1 fixed] The back control only had offsets, not positioning, so it occupied the same grid cell behind the title. It is now explicitly absolute with a visible 48 × 48 hit target and z-index 4.
- [P1 fixed] The header grew from 112px to 132px and its subtitle is single-line at desktop widths, keeping all title copy inside the rounded border; narrow layouts restore normal wrapping.
- [P2 fixed] The legacy draft badge inherited an absolute offset and appeared between the header and question card. Draft is now hidden on this dedicated Diagnosis header; meaningful non-draft states remain available at the header's lower-right edge.
- Automated geometry verifies the back control is fully inside the header, header copy ends at least 8px above its bottom edge, and draft computes to `display: none`. Full responsive and four-stage flow gates remain green.

No actionable P0/P1/P2 findings remain for this correction.

final result: passed

## Fidelity pass 13 — 2026-09-11

- Source: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-QdAs1V.png` (1448 × 1086, selected deep-blue Investigation workspace).
- Implementation: `electron/.tmp/explore-diagnosis-workspace-target-1448x1086.png`; exact-size stacked comparison: `electron/.tmp/phase15-pass13-diagnosis-comparison.png`.
- State: Diagnosis describe step with gathered project Context, dark theme, collapsed Agent panel; CSS viewport and both comparison images are 1448 × 1086 at device scale 1.
- Full-view evidence checks the 30/70 composition, header/stage hierarchy, dense evidence column, hero crop and lower report structure. A separate focused crop was unnecessary because the exact-size comparison keeps the question, Context rows, stage copy and CTA legible.
- [P1 fixed] The former light canvas, unbounded source text and oversized empty area were replaced by the selected navy card system, internally scrolling Context rail, prominent analysis CTA, and structured right workspace.
- [P1 fixed] A project-owned 16:9 raster now shows 学院呱呱 as a hardware-debugging detective with laptop, magnifier and code/build panels; it preserves a dark copy zone instead of substituting CSS or placeholder art.
- [P2 fixed] The first implementation allowed the header title block to auto-place beneath the stage row, causing overlap with the question card. The final grid explicitly anchors the title and stage navigation to row one; the post-fix exact-size comparison shows clear separation.
- [P2 fixed] The hero headline initially wrapped “成” onto a third line. The final 48% copy region and 40px cap reproduce the intended two-line hierarchy without covering the mascot.
- Typography/copy: title, stage descriptions, Context hierarchy and CTA weights follow the reference; the product keeps truthful fixture/live data instead of copying fictional source text.
- Spacing/layout: desktop uses 30/70 columns and equal-height work areas; narrow containers return to one column. Cards, radii and vertical rhythm match the existing Catnip design system.
- Colors/tokens: navy, electric blue, cyan, violet and amber accents match the selected source; semantic Build, Serial, source and hardware colors remain distinct.
- Image quality: the generated 1674 × 942 PNG is sharp, full-bleed and correctly cropped; no visible image asset is replaced by CSS art.
- Interactions: the example button fills the problem, Context checkboxes remain usable, CTA starts the existing analysis, and four-stage plan/handoff persistence still passes.
- Accepted P3: the app-wide draggable assistant may float over the lower report region depending on persisted position; it does not block the three report cards and remains movable.

No actionable P0/P1/P2 findings remain for this pass.

final result: passed

## Fidelity pass 12 — 2026-09-11

- Source: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-xHyTv3.png` (1421 × 1105, selected deep-blue Idea workspace).
- Implementation: `electron/.tmp/explore-idea-workspace-target-1421x1105.png`; same-size stacked comparison: `electron/.tmp/phase15-pass12-idea-comparison.png`.
- [P1 fixed] The flat light canvas and sparse 2-column form were replaced by the selected deep-navy visual system, a compact four-stage navigator, a 30/70 working layout, and clearly bounded input/condition/conversation cards.
- [P1 fixed] The right empty pane now uses a real 16:9 academy-studio raster featuring 学院呱呱, with readable Zhihu value copy and a structured three-part result placeholder below it.
- [P2 fixed] Idea examples are working buttons, current project/hardware facts remain live product data, the primary action stays inside the existing Explore analysis flow, and the conversation remains part of the same Explore Session rather than a second Agent system.
- [P2 fixed] Stage labels now carry descriptions without wrapping vertically; the connected Zhihu state remains visible and compact, while narrow containers return to a single-column layout.
- Automated evidence confirms two desktop columns, conversation containment, loaded 1400 × 800 artwork, five prompt controls, four stage descriptions, two CTA icons, output/input height balance, eight responsive layouts, four-stage handoff persistence, and zero Renderer console errors.
- Accepted P3: the application-wide draggable assistant can overlay a small part of the lower result region depending on its persisted position. The result heading reserves a 150px desktop safe area, and the overlay itself remains movable rather than being hidden for this page.

No actionable P0/P1/P2 findings remain for this pass.

final result: passed

## Fidelity pass 10 — 2026-09-11

**Evidence**

- Source visual truth: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-0Nd9pJ.png`, showing the hard vertical seam through the shared history artwork.
- Implementation: `electron/.tmp/explore-entry-layout-ui.png`, 1920 × 1080 CSS pixels at device scale 1.
- Focused combined comparison: `electron/.tmp/phase15-pass10-chat-seam-comparison.png`; source and implementation history panels are normalized to the same 1080px height and shown together.
- State: expanded Agent panel, dark history artwork, visible rail controls and conversation list; layout interactions and the four-stage Explore flow passed with 0 Renderer console errors.

**Findings and required fidelity surfaces**

- [P1 fixed] The rail's 1px right border created a sharp line across the illustration. It now computes to 0px with no box shadow.
- [P2 fixed] A uniform rail overlay still produced a rectangular tone change after border removal. The overlay now fades horizontally from navy to transparent at the shared edge.
- Typography/copy and spacing remain unchanged; colors retain the navy hierarchy without a hard boundary; the original raster remains single-mounted and aspect-correct; no reference-only content or substitute asset was introduced; rail buttons and conversation controls remain functional.

No actionable P0/P1/P2 findings remain for this correction.

final result: passed

## Fidelity pass 9 — 2026-09-11

**Evidence**

- Source visual truth: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-L7ufbW.png`, 246 × 1316 pixels, showing the remaining solid-color rail and large empty middle area.
- Implementation screenshot: `electron/.tmp/explore-entry-layout-ui.png`, 1920 × 1080 CSS pixels at device scale 1.
- Focused combined comparison: `electron/.tmp/phase15-pass9-chat-comparison.png`. The source was normalized to 202 × 1080; the implementation history panel was cropped at 154 × 1080. Both are shown at equal height in the same image.
- State: dark desktop shell, expanded Agent panel, empty/current conversation state. Primary Chat quick-action injection and Explore four-stage navigation were exercised; Renderer console errors: 0.

**Comparison history and findings**

- [P1 fixed] The decorative raster belonged only to `.chat-history-main`, leaving the 44px function rail as a full-height solid strip. The raster now belongs once to the complete `.chat-history` surface and remains visible through both columns.
- [P2 fixed] The asset's upper half contains intentional night-sky negative space, so 96% sizing left too much unarticulated middle area. A first 128% pass removed the gap but enlarged and cropped the mascot excessively; the final 112% equal-aspect placement balances earlier city/text entry with a more complete mascot.
- [P2 fixed] Opaque child surfaces could have hidden the shared image. The rail now computes to alpha 0.62, the list fades to 0.03, and the main column has no duplicate background image.

**Required fidelity surfaces**

- Fonts/typography: unchanged; search, action, period and conversation text retain their established hierarchy and readable top overlay.
- Spacing/layout: the two-column 44px + flexible grid is unchanged; the shared artwork crosses the boundary continuously without moving controls.
- Colors/tokens: the navy overlay preserves the existing blue theme while allowing the violet city and warm mascot colors through toward the bottom.
- Image quality: the existing 793 × 1983 raster is reused without stretching or code-drawn substitutes; `auto 112%` preserves aspect ratio and bottom anchoring.
- Copy/content: real conversation labels remain state-driven; no reference-only history was fabricated.
- Interactions/accessibility: rail filters, search, new conversation, quick actions, composer and workspace navigation remain functional in the automated interaction pass.

No actionable P0/P1/P2 findings remain for this correction.

final result: passed

## Fidelity pass 8 — 2026-09-11

**Combined evidence**

- Splash: `electron/.tmp/phase15-pass8-splash-comparison.png`; user source 740 × 446 and implementation shell normalized from the real 760 × 470 Electron capture.
- Explore: `electron/.tmp/phase15-pass8-explore-comparison.png`; user 980 × 946 reference and the 2048 × 1105 implementation right panel normalized to the same review frame.
- Chat: `electron/.tmp/phase15-pass8-chat-comparison.png`; user 596 × 1024 reference and the implementation left workspace crop normalized to 596 × 1024.
- Skill Hub: `electron/.tmp/phase15-pass8-skill-comparison.png`; preserves each source aspect ratio and makes the requested two-row → one-row change explicit.

**Findings and fixes**

- [P1 fixed] History and local-knowledge cards had no independent scroll ownership; long associated-project paths could expand the record. Both lists now compute to `overflow-y: scroll` with stable gutters, and paths compute to hidden/ellipsis/nowrap inside the row.
- [P1 fixed] Skill Hub repeated tab switching, Browser Workbench and the current URL across multiple dark rows. The Skill view now renders one 56px blue row containing the visible tab region, URL field and Open action; the three redundant bars are absent.
- [P2 fixed] The chat composer split its editor and actions into separate surfaces. The textarea, attachment control, Skill control and square Lucide Send button now share one bordered composer; geometry verification confirms the action row is contained.
- [P2 fixed] The history illustration occupied too little of the tall rail. The supplied raster now fills 96% of the rail height with bottom anchoring and a dark readability overlay, without stretching.
- [P2 fixed] The top-left brand remained visually boxed and its caption was undersized. The brand surface is now transparent with no border/shadow/backdrop filter; icon is 42px, name 16px and caption 10px. The middle navigation and right action glass surfaces remain distinct.
- [P2 fixed] Splash branding and mascot no longer matched the current product. The new software icon and a genuine-alpha Academy Guagua are used on a deep navy/cyan/violet surface; the progress track increased from 7px green to 13px blue.
- [P2 fixed] The Explore Hero, connection entry and cards felt like disconnected bands. The real Zhihu status/action card now sits inside the Hero's continuous visual region, followed directly by the two entry cards.

**Accessibility and behavior**

- Existing semantic buttons, labels, keyboard handling, reduced-motion splash handling, connection Secret boundary and Explore four-stage confirmation gate are unchanged.
- Automated checks cover 1200–3840px desktop widths, 534–1802px Explore container widths, scroll containment, no overflow, loaded raster dimensions, visible window controls and zero Renderer console errors.
- The floating assistant remains user-draggable and position-persistent; its fixture position is not treated as a layout target for this pass.

No actionable P0/P1/P2 findings remain for the requested surfaces.

final result: passed

## Fidelity pass 6 — 2026-09-11

- Source visual truth: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-v0IC9N.png` at 2559 × 1381 pixels, showing the live Explore home before this correction.
- Normalization: source resized to 2048 × 1105 at device scale 1 equivalent; implementation captured at a 2048 × 1105 CSS viewport with the left workspace set to 30%.
- Implementation: `electron/.tmp/explore-home-target-2048x1105.png`.
- Full-view comparison: `electron/.tmp/phase15-v7-explore-comparison.png`, normalized source left and implementation right.
- Focused review was performed on the full-height entry and connection region because both are readable at the 4096 × 1105 combined resolution; no additional crop was required.

**Comparison history and findings**

- [P1 fixed] Explore typography was materially smaller than the surrounding desktop shell. Entry titles now compute to 40px on desktop (31.2px compact), descriptions to 15px, Hero copy to 17px, and history/knowledge/project text was raised by one hierarchy step.
- [P2 fixed] The 438px entry target still appeared shallow in the user's live viewport. Desktop cards now measure 500px; low-height windows use 450px and narrow containers use 410px without text/art overlap.
- [P2 fixed] The connected Zhihu state was reduced to a Hero pill while the full connection component disappeared. The real status and all existing safe connection actions now render in one independent left-aligned card.
- [P2 fixed] Large near-white surfaces made the page feel overexposed. The home canvas, entry cards and dashboard surfaces now use restrained blue-purple gradients with dark navy text preserved.

**Required fidelity surfaces**

- Fonts/typography: larger optical hierarchy, readable body size and unchanged system font fallback; automated minimums cover entry titles and descriptions.
- Spacing/layout: connection card occupies the left half; cards are taller and illustrations remain right-anchored without crossing copy in all eight responsive scenarios.
- Colors/tokens: brightness is reduced with cool blue-purple gradients; semantic purple/cyan entry accents and success/error connection colors remain intact.
- Image quality: the supplied Explore mascot assets remain unchanged, sharp and uncropped; no substitute asset or code-drawn illustration was added.
- Copy/content: live connection messages, actions, sessions, knowledge and project data continue to come from existing product state. Test screenshots use honest fixture/empty state rather than copying reference data.
- Interactions/accessibility: both entries, refresh/install/configure connection actions, six workspace tabs and four-stage Explore flow remain functional; console errors are 0.

No actionable P0/P1/P2 findings remain for this correction.

final result: passed

## Fidelity pass 5 — 2026-09-11

- Source: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-MFkVAd.png`, showing the unwanted continuous dark strip behind the three shell segments.
- Implementation: `electron/.tmp/workspace-shell-target-2048x1152.png` at a 2048 × 1152 CSS viewport.
- Focused same-width comparison: `electron/.tmp/phase15-v6-shell-comparison.png`; source and implementation are each cropped to 2048 × 79 and stacked without scaling.
- [P1 fixed] The full-width positioning layer still inherited `backdrop-filter`, visually recreating the retired long bar even with a transparent background. The outer layer now has no background, border, shadow, filter, backdrop filter, or pseudo-element decoration.
- [P2 fixed] The three child containers inherited NES `is-dark` surfaces, producing black-gray boxes. Those classes were removed; the three segments now use the established navy-blue translucent glass surface.
- Automated evidence: the outer layer computes to transparent with no border/filter/backdrop-filter; exactly three child surfaces compute to `rgba(9, 39, 98, 0.76)`. Geometry, responsive scenarios, four-stage Explore flow and console-error checks remain green.
- Visual evidence: unfiltered cosmic wallpaper is visible before, between and after the three boxes; no continuous material spans the row.

No actionable P0/P1/P2 findings remain for this correction.

final result: passed

## Fidelity pass 4 — 2026-09-11

**Source truth**

- Assistant copy: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-NqedPo.png`.
- Existing 2048px shell and requested split direction: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-F09384.png`.
- Supplied brand/software icon: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-dzsEqZ.png` (1258 × 1258 PNG).
- Truncated task label: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-I1Cmro.png`.

**Implementation evidence**

- Full implementation: `electron/.tmp/workspace-shell-target-2048x1152.png`, CSS viewport 2048 × 1152, device scale 1.
- Focused equal-width comparison: `electron/.tmp/phase15-v4-shell-comparison.png`; source and implementation are each cropped to 2048 × 67 and stacked without density scaling.
- Assistant state: `electron/.tmp/software-assistant-ui.png`, real Electron CDP at 2560 × 1392; visible link is `Neil Bauman · GitHub`.

**Comparison history and findings**

- [P1 fixed] The first implementation retained the final twelve-column cascade lock, squeezing the nested center surface to 117px and displacing the right controls. The final three-column lock now yields separate 220px / 50vw / 350px surfaces.
- [P2 fixed] The legacy alignment assertion compared internal controls rather than the three new surfaces. The revised gate verifies the surfaces share a top edge and have visible gaps.
- [P2 fixed] The task label previously ellipsized. Its dedicated 132px track now contains the full `任务管理器` text, verified by label/button rectangles.

**Required fidelity surfaces**

- Typography/copy: labels keep the established system font, weights and compact hierarchy; `任务管理器` is complete and “作者” is absent from the assistant link and accessibility label.
- Spacing/layout: three 50px surfaces are separated by visible starfield gaps; the 2048px center surface is 1024px wide and the right controls stay inside the viewport.
- Colors/tokens: all three surfaces reuse the existing navy glass fill, blue border, selected blue tab and focus tokens.
- Image quality: the supplied raster is reused directly in Renderer; 512px PNG and valid 256px ICO derivatives preserve the subject and transparency. No CSS/SVG substitute was introduced.
- Icons/interactions: existing icon-library tab icons remain aligned; all six tabs, project selector, settings, minimize, maximize/restore and close remain functional. Software-assistant UI smoke confirms the GitHub control remains clickable.
- Responsiveness/accessibility: 1200–3840 layout matrix passes; semantic tablist/group roles, labels and keyboard-capable buttons remain present; console errors are 0.

No actionable P0/P1/P2 findings remain. The full-screen reference content differs by live project/session state only and was not fabricated.

final result: passed

## Fidelity pass 3 — 2026-09-11

- Source: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-IPnre5.png` (1573 × 1276 Explore target), `codex-clipboard-2vUR8N.png` (compact top shell with window controls), and `codex-clipboard-FQvcbz.png` (compact navigation crop).
- Implementation: `electron/.tmp/explore-entry-target-1573x1276.png`.
- Combined same-viewport review: `electron/.tmp/phase15-v3-final-comparison.png` (source left, implementation right).
- P1 fixed: the final legacy nine-column cascade lock overrode the new shell and pushed the three window controls beyond the viewport. A final explicit 12-column lock now reserves dedicated project, settings, and 132px window-control tracks.
- P1 fixed: the six tabs previously expanded across almost the full row. At 1536px they now span x=320–1054 (734px, about 48% of viewport width) and retain distinct active/border states.
- P1 fixed: Explore entry cards increased from 292px to 438px; the 1573 × 1276 dashboard is 558px high, eliminating the previous unused lower canvas while preserving full mascot artwork.
- P2 fixed: session, knowledge, and current-project rows now have independent fills, borders, radii, and hover states. Empty test data remains an honest empty state.
- Functional checks: three window controls are present after Settings and stay inside the viewport; core navigation, Chat prompt injection, Explore entries, four-stage handoff gate, Onboarding, and responsive layouts pass with zero console errors.
- Accepted P3: the floating assistant retains the user's persisted draggable position and can overlap a small part of the history area. Reference-only fictional rows are not copied into the product.

P0/P1/P2 are cleared for this pass.

final result: passed

## Fidelity pass 11 — 2026-09-11

- Source: `C:\Users\20917\AppData\Local\Temp\codex-clipboard-E4v7RM.png` (958 × 405, Explore Hero with clipped Zhihu state).
- Implementation: `electron/.tmp/explore-home-target-2048x1105.png`; focused stacked comparison: `electron/.tmp/phase15-pass11-zhihu-status-comparison.png`.
- [P1 fixed] The connected-state card previously had an 84px minimum height, so the Hero grid had insufficient room for the title, description, status, gap, and padding. The lower part of the status appeared clipped at the entry boundary.
- The non-actionable connected/checking state is now a 52px compact row. Its green state dot, platform label, connection result, and “重新检查” action remain fully visible.
- Actionable install, Secret, and error states retain the 84px minimum plus their existing explanatory steps and controls.
- Automated geometry confirms the compact card is 48–58px tall and completely contained by the Hero. The comparison confirms the entry cards begin below the full connection card with no crop.

No actionable P0/P1/P2 findings remain for this change.

final result: passed
