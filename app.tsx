// bb-plugin-tinkerer — frontend entry.
//
// Surfaces: the Tinkerer nav panel (tab in the route), the same panel beside
// a thread, a sidebar-footer disclosure menu, the ::tinkerer{post} directive,
// the agent-post approval card, the unread pill on the sidebar row, and an
// invisible overlay that relays server toasts.
import { useCallback } from "react";
import { definePluginApp, useBbNavigate, type PluginNavPanelProps, type PluginThreadPanelProps } from "@get-bb/plugin-sdk/app";
import { useState } from "react";
import "./app.css";
import { PostApproval } from "./app/Approval";
import { ToastBridge, UnreadAccessory } from "./app/Bridges";
import { TinkererDirective } from "./app/Directive";
import { FooterMenu } from "./app/FooterMenu";
import { PANEL_PATH, parseSubPath, subPathFor, TinkererPanel, type PanelRoute } from "./app/Panel";

function NavPanel({ subPath }: PluginNavPanelProps) {
  const navigate = useBbNavigate();
  const route = parseSubPath(subPath);
  const onRoute = useCallback((next: PanelRoute) => navigate.toPluginPanel(PANEL_PATH, { subPath: subPathFor(next) }), [navigate]);
  return <TinkererPanel route={route} onRoute={onRoute} />;
}

function ThreadPanel({ threadId }: PluginThreadPanelProps) {
  const [route, setRoute] = useState<PanelRoute>({ tab: "timeline", inbox: "notifications" });
  return <TinkererPanel route={route} onRoute={setRoute} threadId={threadId} />;
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "tinkerer",
    title: "Tinkerer",
    icon: "Zap",
    path: PANEL_PATH,
    component: NavPanel,
    experimental_sidebarAccessory: UnreadAccessory,
  });

  app.slots.threadPanelAction({
    id: "tinkerer",
    title: "Tinkerer Club",
    icon: "Zap",
    layout: "flush",
    component: ThreadPanel,
  });

  app.experimental_sidebarFooter.register({
    kind: "disclosure",
    id: "menu",
    label: "Tinkerer Club",
    icon: "Zap",
    component: FooterMenu,
  });

  app.slots.messageDirective({ id: "tinkerer", component: TinkererDirective });
  app.slots.pendingInteraction({ id: "post-approval", component: PostApproval });
  app.slots.experimental_appOverlay({ id: "toasts", component: ToastBridge });
});
