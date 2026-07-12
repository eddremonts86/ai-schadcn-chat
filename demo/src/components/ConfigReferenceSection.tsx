import type { ReactElement } from "react";
import { ConfigReference } from "./ConfigReference";

/**
 * Configuration reference doc grid. The live playground was previously
 * rendered above this grid; it now lives in <UnifiedPlayground /> embedded
 * inside <LiveDemoSection /> so the page only mounts one <ChatPanel />.
 */
export function ConfigReferenceSection(): ReactElement {
  return <ConfigReference />;
}