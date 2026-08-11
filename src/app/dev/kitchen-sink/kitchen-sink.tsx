"use client";

import {
  ArrowRight,
  BarChart3,
  Ban,
  FileText,
  Heart,
  Moon,
  Pencil,
  Settings,
  Sun,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AmountSelector,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Code,
  CodeBlock,
  CopyButton,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Eyebrow,
  Field,
  Heading,
  Input,
  Lead,
  Muted,
  Pagination,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ProgressBar,
  RadioGroup,
  RadioOption,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  SeparatorWithLabel,
  Skeleton,
  SkeletonText,
  Slider,
  Spinner,
  Stat,
  StatRow,
  StatusDot,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
  toast,
  Tooltip,
  TooltipProvider,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="scroll-mt-20"
      id={title.toLowerCase().replace(/\s+/g, "-")}
    >
      <div className="section-rule">
        <Heading level={2} size="md">
          {title}
        </Heading>
        {description ? <Muted className="mt-1">{description}</Muted> : null}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Eyebrow>{label}</Eyebrow>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export function KitchenSink() {
  const { resolvedTheme, setTheme } = useTheme();
  const [amount, setAmount] = useState<number | null>(2500);
  const [page, setPage] = useState(3);
  const [checked, setChecked] = useState(true);
  const [sliderValue, setSliderValue] = useState([40]);

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-4xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow>Design system</Eyebrow>
            <Heading level={1} size="display" className="mt-1">
              Kitchen sink
            </Heading>
            <Lead className="mt-2">
              Every component in <code>components/ui</code>, in every variant
              and state. Toggle the theme to verify both palettes.
            </Lead>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </header>

        {/* ------------------------------------------------------------- */}
        <Section
          title="Tokens"
          description="Semantic colours only — app code never names a hue."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["canvas", "bg-canvas"],
              ["surface", "bg-surface"],
              ["surface-sunken", "bg-surface-sunken"],
              ["surface-inverted", "bg-surface-inverted"],
              ["accent", "bg-accent"],
              ["accent-subtle", "bg-accent-subtle"],
              ["brand", "bg-brand"],
              ["success", "bg-success"],
              ["warning", "bg-warning"],
              ["danger", "bg-danger"],
              ["info", "bg-info"],
              ["strong", "bg-strong"],
            ].map(([name, cls]) => (
              <div key={name} className="space-y-1.5">
                <div
                  className={`h-12 rounded-sm border border-subtle ${cls}`}
                />
                <p className="font-mono text-[0.6875rem] text-muted">{name}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ------------------------------------------------------------- */}
        <Section title="Typography" description="One scale, defined once.">
          <div className="space-y-3">
            <Heading level={2} size="display">
              Display — page titles
            </Heading>
            <Heading level={2} size="xl">
              XL — section titles
            </Heading>
            <Heading level={3} size="lg">
              LG — card group titles
            </Heading>
            <Heading level={4} size="md">
              MD — card titles
            </Heading>
            <Heading level={5} size="sm">
              SM — dense labels
            </Heading>
            <Lead>Lead paragraph — the sentence under a page heading.</Lead>
            <Text>Body text at the default size and weight.</Text>
            <Text size="sm" variant="muted">
              Small muted text for secondary information.
            </Text>
            <Muted>Muted helper copy.</Muted>
            <Eyebrow>Eyebrow / label-caps</Eyebrow>
            <Text>
              Inline <Code>code</Code> inside a sentence.
            </Text>
            <CodeBlock>{`<script src="https://givedirect.org/embed.js" async></script>`}</CodeBlock>
          </div>
        </Section>

        {/* ------------------------------------------------------------- */}
        <Section
          title="Button"
          description="asChild renders links with identical variants."
        >
          {BUTTON_VARIANTS.map((variant) => (
            <Row key={variant} label={variant}>
              <Button variant={variant} size="sm">
                Small
              </Button>
              <Button variant={variant}>Medium</Button>
              <Button variant={variant} size="lg">
                Large
              </Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
              <Button variant={variant} loading>
                Loading
              </Button>
            </Row>
          ))}

          <Row label="Icons and asChild">
            <Button size="icon" variant="outline">
              <Settings />
              <span className="sr-only">Settings</span>
            </Button>
            <Button size="icon-sm" variant="ghost">
              <Trash2 />
              <span className="sr-only">Delete</span>
            </Button>
            <Button>
              <Heart /> Donate now
            </Button>
            <Button variant="outline">
              Continue <ArrowRight />
            </Button>
            <Button asChild variant="outline">
              <Link href="/dev/kitchen-sink">This is an anchor</Link>
            </Button>
            <Button asChild variant="link">
              <a href="#top">Link variant on an anchor</a>
            </Button>
          </Row>

          <Row label="Full width">
            <div className="w-full max-w-sm">
              <Button fullWidth size="lg">
                Donate {formatCurrency(amount ?? 0)} now
              </Button>
            </div>
          </Row>
        </Section>

        {/* ------------------------------------------------------------- */}
        <Section
          title="Inputs & Field"
          description="Field owns labels, IDs and aria wiring."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Display name"
              description="Shown on your public page."
              required
            >
              <Input placeholder="Alex Smith" />
            </Field>

            <Field
              label="Meta title"
              hint="42 / 60"
              description="Ideal length is 50–60 characters."
            >
              <Input defaultValue="Support Clean Water Initiatives" />
            </Field>

            <Field
              label="Email address"
              error="That email is already registered."
            >
              <Input type="email" defaultValue="alex@example.com" />
            </Field>

            <Field
              label="Disabled"
              disabled
              description="Cannot be edited yet."
            >
              <Input disabled defaultValue="Locked" />
            </Field>

            <Field label="Goal amount">
              <Input leading="$" inputMode="decimal" placeholder="50,000" />
            </Field>

            <Field label="Currency">
              <Select defaultValue="usd">
                <SelectTrigger>
                  <SelectValue placeholder="Choose a currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD — US Dollar</SelectItem>
                  <SelectItem value="eur">EUR — Euro</SelectItem>
                  <SelectItem value="gbp">GBP — British Pound</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Short bio"
              hint="58 / 300"
              className="sm:col-span-2"
              description="Tell donors a little about your mission."
            >
              <Textarea
                resizable={false}
                defaultValue="Working to bring clean water to communities in need."
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              orientation="horizontal"
              label="Allow custom amounts"
              description="Donors can type any amount above the minimum."
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
              />
            </Field>

            <Field orientation="horizontal" label="Indeterminate">
              <Checkbox checked="indeterminate" />
            </Field>

            <Field orientation="horizontal" label="Disabled checkbox" disabled>
              <Checkbox disabled />
            </Field>

            <Field orientation="horizontal" label="Show progress bar">
              <Switch defaultChecked />
            </Field>

            <Field orientation="horizontal" label="Disabled switch" disabled>
              <Switch disabled />
            </Field>
          </div>

          <Field label="Donation frequency" asFieldset>
            <RadioGroup
              defaultValue="one-time"
              orientation="horizontal"
              className="mt-2"
            >
              <RadioOption value="one-time">One-time</RadioOption>
              <RadioOption value="monthly" description="Charged every 30 days">
                Monthly
              </RadioOption>
              <RadioOption value="annual" disabled>
                Annual
              </RadioOption>
            </RadioGroup>
          </Field>

          <Field
            label="Accent hue"
            description={`Value: ${sliderValue[0]}`}
            asFieldset
          >
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              max={100}
              step={1}
              className="mt-3 max-w-sm"
            />
          </Field>
        </Section>

        {/* ------------------------------------------------------------- */}
        <Section
          title="Feedback"
          description="Alerts, badges, spinners, skeletons."
        >
          <Row label="Badges">
            <Badge>Neutral</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="success" dot>
              Completed
            </Badge>
            <Badge variant="warning" dot>
              Processing
            </Badge>
            <Badge variant="danger">Failed</Badge>
            <Badge variant="info">Refunded</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge size="sm">Small</Badge>
          </Row>

          <Row label="Status dots">
            <StatusDot tone="published">Published</StatusDot>
            <StatusDot tone="draft">Draft</StatusDot>
            <StatusDot tone="archived">Archived</StatusDot>
          </Row>

          <div className="space-y-3">
            <Alert variant="info" title="Heads up">
              Your page is a draft. Publish it to start collecting donations.
            </Alert>
            <Alert variant="success" title="Page published">
              Live at /d/clean-water-initiative.
            </Alert>
            <Alert
              variant="warning"
              title="Donations are not enabled yet"
              action={<Button size="sm">Learn more</Button>}
            >
              Visitors can see your page, but the Donate button is disabled.
            </Alert>
            <Alert variant="danger" title="That address is taken">
              Another page already uses /d/clean-water.
            </Alert>
            <Alert variant="neutral" icon={false}>
              A plain alert with no icon.
            </Alert>
          </div>

          <Row label="Spinner">
            <Spinner size="xs" />
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </Row>

          <div className="space-y-3">
            <Eyebrow>Skeleton</Eyebrow>
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1">
                <SkeletonText lines={2} />
              </div>
            </div>
          </div>

          <Row label="Toast">
            <Button variant="outline" onClick={() => toast("Page saved")}>
              Default
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.success("Page published", {
                  description: "Live at /d/clean-water",
                })
              }
            >
              Success
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.error("Could not save changes")}
            >
              Error
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast("Draft deleted", {
                  action: { label: "Undo", onClick: () => toast("Restored") },
                })
              }
            >
              With action
            </Button>
          </Row>
        </Section>

        {/* ------------------------------------------------------------- */}
        <Section
          title="Layout"
          description="Cards, separators, avatars, empty states."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Default card</CardTitle>
                  <CardDescription>1px outline, no shadow.</CardDescription>
                </div>
                <Badge variant="accent">New</Badge>
              </CardHeader>
              <CardContent>
                <Text size="sm" variant="muted">
                  Level 1 surface sitting on the neutral canvas.
                </Text>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline">
                  Secondary
                </Button>
                <Button size="sm">Primary</Button>
              </CardFooter>
            </Card>

            <Card tone="warm" interactive>
              <CardContent>
                <CardTitle>Warm / interactive</CardTitle>
                <CardDescription className="mt-1">
                  Hover for the ambient lift.
                </CardDescription>
              </CardContent>
            </Card>

            <Card tone="accent">
              <CardContent>
                <CardTitle>Accent</CardTitle>
                <CardDescription className="mt-1">
                  For callouts and selected states.
                </CardDescription>
              </CardContent>
            </Card>

            <Card tone="dashed">
              <EmptyState
                icon={FileText}
                title="Create new page"
                description="Start a new campaign and customize your donation experience."
                action={<Button size="sm">Create page</Button>}
              />
            </Card>
          </div>

          <Row label="Avatars">
            <Avatar size="xs" name="Jane Smith" />
            <Avatar size="sm" name="Michael Ross" />
            <Avatar size="md" name="Alex River" />
            <Avatar size="lg" name="Sarah Jenkins" />
            <Avatar size="xl" name="Alex Smith" shape="rounded" />
          </Row>

          <div className="space-y-4">
            <Separator />
            <SeparatorWithLabel>or</SeparatorWithLabel>
          </div>

          <EmptyState
            icon={Ban}
            title="No donations yet"
            description="Once your page is live and shared, donations will appear here."
            action={
              <Button size="sm" variant="outline">
                Share your page
              </Button>
            }
          />
        </Section>

        {/* ------------------------------------------------------------- */}
        <Section
          title="Overlays"
          description="Dialog, alert dialog, dropdown, popover, tooltip."
        >
          <Row label="Overlays">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Support the cause</DialogTitle>
                  <DialogDescription>
                    Your contribution helps us continue our mission to provide
                    clean water to communities in need.
                  </DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <AmountSelector
                    suggestedAmounts={[1000, 2500, 5000]}
                    value={amount}
                    onChange={setAmount}
                  />
                </DialogBody>
                <DialogFooter>
                  <Button fullWidth size="lg">
                    Donate {formatCurrency(amount ?? 0)} now
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete page</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this page?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The page will stop accepting donations immediately. Existing
                    donation records are kept for your reporting.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Page</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <Heading level={3} size="xs">
                  Fee breakdown
                </Heading>
                <dl className="mt-2 divide-y divide-[var(--border-subtle)]">
                  <StatRow label="Donation" value="$100.00" />
                  <StatRow label="Platform fee (5%)" value="−$5.00" />
                  <StatRow label="To you" value="$95.00" emphasis />
                </dl>
              </PopoverContent>
            </Popover>

            <Tooltip content="Copy the embed snippet">
              <Button variant="ghost" size="icon">
                <FileText />
                <span className="sr-only">Embed</span>
              </Button>
            </Tooltip>

            <CopyButton
              value="https://givedirect.org/d/clean-water"
              variant="outline"
            />
            <CopyButton value="copied" iconOnly variant="outline" />
          </Row>
        </Section>

        {/* ------------------------------------------------------------- */}
        <Section title="Data" description="Table, tabs, pagination, stats.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Total raised (30 days)"
              value="$12,450"
              delta={0.145}
              deltaLabel="vs last month"
              icon={TrendingUp}
            />
            <Stat
              label="New supporters"
              value="342"
              delta={0.08}
              deltaLabel="vs last month"
              icon={Users}
            />
            <Stat
              label="Page conversion rate"
              value="4.2%"
              hint="Stable this week"
              icon={BarChart3}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent supporters</CardTitle>
              <Button variant="link" size="sm">
                View all
              </Button>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supporter</TableHead>
                  <TableHead numeric>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["Jane Smith", 5000, "Today, 2:45 PM", "Completed"],
                  ["Anonymous", 10000, "Yesterday, 11:20 AM", "Completed"],
                  ["Michael Ross", 2500, "Oct 24, 9:00 AM", "Processing"],
                ].map(([name, cents, date, status]) => (
                  <TableRow key={String(name) + String(date)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm" name={String(name)} />
                        <span className="font-medium">{name}</span>
                      </div>
                    </TableCell>
                    <TableCell numeric>
                      {formatCurrency(Number(cents))}
                    </TableCell>
                    <TableCell className="text-muted">{date}</TableCell>
                    <TableCell>
                      <Badge
                        dot
                        variant={status === "Completed" ? "success" : "warning"}
                      >
                        {status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <CardFooter>
              <Pagination
                page={page}
                pageCount={12}
                totalItems={237}
                onPageChange={setPage}
                className="w-full"
              />
            </CardFooter>
          </Card>

          <Tabs defaultValue="editor">
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="embed">Embed</TabsTrigger>
              <TabsTrigger value="donations">Donations</TabsTrigger>
            </TabsList>
            <TabsContent value="editor">
              <Text size="sm" variant="muted">
                Underline tab variant — used for per-page navigation.
              </Text>
            </TabsContent>
            <TabsContent value="settings">
              <Text size="sm" variant="muted">
                Settings panel.
              </Text>
            </TabsContent>
            <TabsContent value="embed">
              <Text size="sm" variant="muted">
                Embed panel.
              </Text>
            </TabsContent>
            <TabsContent value="donations">
              <Text size="sm" variant="muted">
                Donations panel.
              </Text>
            </TabsContent>
          </Tabs>

          <Tabs defaultValue="7d">
            <TabsList variant="pill" className="w-fit">
              <TabsTrigger value="7d">7 days</TabsTrigger>
              <TabsTrigger value="30d">30 days</TabsTrigger>
              <TabsTrigger value="90d">90 days</TabsTrigger>
            </TabsList>
            <TabsContent value="7d">
              <Text size="sm" variant="muted">
                Pill tab variant — used for date-range switches.
              </Text>
            </TabsContent>
            <TabsContent value="30d" />
            <TabsContent value="90d" />
          </Tabs>
        </Section>

        {/* ------------------------------------------------------------- */}
        <Section
          title="Domain"
          description="Still library components — no app imports."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <Eyebrow>Progress bar</Eyebrow>
              <ProgressBar valueCents={1245000} goalCents={5000000} />
              <ProgressBar
                valueCents={8920000}
                goalCents={10000000}
                size="lg"
              />
              <ProgressBar valueCents={0} goalCents={10000000} size="sm" />
              <ProgressBar
                inline
                valueCents={1245000}
                goalCents={5000000}
                label="Raised"
              />
            </div>

            <div className="space-y-4">
              <Eyebrow>Amount selector</Eyebrow>
              <AmountSelector
                suggestedAmounts={[1000, 2500, 5000]}
                value={amount}
                onChange={setAmount}
                size="lg"
              />
              <AmountSelector
                suggestedAmounts={[500, 1000, 2500, 10000]}
                value={null}
                onChange={() => {}}
                allowCustomAmount={false}
              />
              <AmountSelector
                suggestedAmounts={[1000, 2500, 5000]}
                value={50}
                onChange={() => {}}
                error="Minimum donation is $1.00"
              />
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------------------- */}
        <Section
          title="Accordion"
          description="Used by the FAQ, with FAQPage JSON-LD."
        >
          <Accordion type="single" collapsible className="max-w-2xl">
            <AccordionItem value="fee">
              <AccordionTrigger>
                What fees does GiveDirect charge?
              </AccordionTrigger>
              <AccordionContent>
                A flat 5% platform fee per donation. There is no monthly cost
                and no setup fee.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="live">
              <AccordionTrigger>
                Can I collect donations today?
              </AccordionTrigger>
              <AccordionContent>
                Not yet — no payment provider is connected, so the Donate button
                is disabled. Everything else works: publish a page, embed it,
                and watch the traffic.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="embed">
              <AccordionTrigger>
                Can I embed my page on my own site?
              </AccordionTrigger>
              <AccordionContent>
                Yes. Every published page ships an iframe snippet that resizes
                itself to fit its container.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>
      </div>
    </TooltipProvider>
  );
}
