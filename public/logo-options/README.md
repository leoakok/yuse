# Yuse logo options

Three slingshot logo concepts generated with OpenAI `gpt-image-1`, then refined as bold vector SVGs for small-size legibility.

| Option | Concept | SVG | PNG (AI reference) |
|--------|---------|-----|-------------------|
| **A** | Literal slingshot — Y-fork frame, elastic, pouch, stone | [option-a.svg](./option-a.svg) | [option-a.png](./option-a.png) |
| **B** | Letter Y — bold Y forks with amber band across tips | [option-b.svg](./option-b.svg) | [option-b.png](./option-b.png) |
| **C** | Mascot — rounded slingshot with smile + briefcase | [option-c.svg](./option-c.svg) | [option-c.png](./option-c.png) |

## Preview in the app

With the dev server running, open:

**http://localhost:3000/logo-preview**

Shows all three options at 64px and 16px on light and dark backgrounds, plus the current default (Option C).

## Use in code

```tsx
import { YuseLogo } from "@/components/brand/yuse-logo";

<YuseLogo variant="a" className="size-5" />
<YuseLogo variant="b" className="size-5" />
<YuseLogo variant="c" className="size-5" />
```

Or import directly:

```tsx
import { YuseLogoA, YuseLogoB, YuseLogoC } from "@/components/brand/yuse-logo-options";
```

The default `YuseLogo` (no variant) renders Option C — the mascot slingshot mark.
