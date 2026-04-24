import { Component, createEffect, createMemo, createSignal, For, Show, type JSX } from "solid-js"
import { Select } from "@opencode-ai/ui/select"
import { TextField } from "@opencode-ai/ui/text-field"
import { showToast } from "@opencode-ai/ui/toast"
import { useLanguage } from "@/context/language"
import { useGlobalSync } from "@/context/global-sync"
import { useModels } from "@/context/models"
import { SettingsList } from "./settings-list"

const AGENT_NAMES = ["build", "plan", "general", "explore"] as const
type AgentName = (typeof AGENT_NAMES)[number]

const AGENT_KEYS: Record<AgentName, { title: string; description: string }> = {
  build: {
    title: "settings.agents.agent.build.title",
    description: "settings.agents.agent.build.description",
  },
  plan: {
    title: "settings.agents.agent.plan.title",
    description: "settings.agents.agent.plan.description",
  },
  general: {
    title: "settings.agents.agent.general.title",
    description: "settings.agents.agent.general.description",
  },
  explore: {
    title: "settings.agents.agent.explore.title",
    description: "settings.agents.agent.explore.description",
  },
}

interface SettingsRowProps {
  title: string | JSX.Element
  description: string | JSX.Element
  children: JSX.Element
}

const SettingsRow: Component<SettingsRowProps> = (props) => (
  <div class="flex flex-wrap items-center gap-4 py-3 border-b border-border-weak-base last:border-none sm:flex-nowrap">
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="text-14-medium text-text-strong">{props.title}</span>
      <span class="text-12-regular text-text-weak">{props.description}</span>
    </div>
    <div class="flex w-full justify-end sm:w-auto sm:shrink-0">{props.children}</div>
  </div>
)

const AgentSection: Component<{ name: AgentName }> = (props) => {
  const language = useLanguage()
  const globalSync = useGlobalSync()
  const models = useModels()

  const agentConfig = createMemo(() => globalSync.data.config.agent?.[props.name])

  const modelOptions = createMemo(() => {
    const none = { value: "", label: language.t("settings.agents.model.none") }
    return [
      none,
      ...models.list().map((m) => ({
        value: `${m.provider.id}/${m.id}`,
        label: `${m.provider.name} / ${m.name}`,
      })),
    ]
  })

  const currentModelValue = createMemo(() => agentConfig()?.model ?? "")

  const currentModel = createMemo(() => {
    const v = currentModelValue()
    if (!v) return undefined
    const slashIdx = v.indexOf("/")
    const providerID = v.slice(0, slashIdx)
    const modelID = v.slice(slashIdx + 1)
    return models.list().find((m) => m.provider.id === providerID && m.id === modelID)
  })

  const variantOptions = createMemo(() => {
    const m = currentModel()
    if (!m?.variants || Object.keys(m.variants).length === 0) return []
    const none = { value: "", label: language.t("settings.agents.variant.none") }
    return [none, ...Object.keys(m.variants).map((v) => ({ value: v, label: v }))]
  })

  const currentVariantValue = createMemo(() => {
    if (!currentModel()) return ""
    return agentConfig()?.variant ?? ""
  })

  const [localPrompt, setLocalPrompt] = createSignal(agentConfig()?.prompt ?? "")

  createEffect(() => {
    setLocalPrompt(agentConfig()?.prompt ?? "")
  })

  const save = async (patch: { model?: string; variant?: string; prompt?: string }) => {
    const current = agentConfig() ?? {}
    const next: Record<string, unknown> = { ...current, ...patch }
    if (next.model === "") delete next.model
    if (next.variant === "") delete next.variant
    if (next.prompt === "") delete next.prompt
    await globalSync.updateConfig({ agent: { [props.name]: next } }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      showToast({ title: language.t("common.requestFailed"), description: message })
    })
  }

  return (
    <div class="flex flex-col gap-1">
      <h3 class="text-14-medium text-text-strong pb-2">
        {language.t(AGENT_KEYS[props.name].title)}
      </h3>
      <SettingsList>
        <SettingsRow
          title={language.t("settings.agents.row.model.title")}
          description={language.t("settings.agents.row.model.description")}
        >
          <Select
            options={modelOptions()}
            current={modelOptions().find((o) => o.value === currentModelValue())}
            value={(o) => o.value}
            label={(o) => o.label}
            onSelect={(option) => {
              if (option === undefined) return
              void save({ model: option.value, variant: "" })
            }}
            variant="secondary"
            size="small"
            triggerVariant="settings"
            triggerStyle={{ "min-width": "220px" }}
          />
        </SettingsRow>

        <Show when={variantOptions().length > 0}>
          <SettingsRow
            title={language.t("settings.agents.row.variant.title")}
            description={language.t("settings.agents.row.variant.description")}
          >
            <Select
              options={variantOptions()}
              current={variantOptions().find((o) => o.value === currentVariantValue())}
              value={(o) => o.value}
              label={(o) => o.label}
              onSelect={(option) => {
                if (option === undefined) return
                void save({ variant: option.value })
              }}
              variant="secondary"
              size="small"
              triggerVariant="settings"
            />
          </SettingsRow>
        </Show>

        <div class="py-3 flex flex-col gap-2 border-b border-border-weak-base last:border-none">
          <div class="flex min-w-0 flex-col gap-0.5">
            <span class="text-14-medium text-text-strong">
              {language.t("settings.agents.row.prompt.title")}
            </span>
            <span class="text-12-regular text-text-weak">
              {language.t("settings.agents.row.prompt.description")}
            </span>
          </div>
          <TextField
            label={language.t("settings.agents.row.prompt.title")}
            hideLabel
            multiline
            value={localPrompt()}
            onChange={setLocalPrompt}
            onBlur={() => void save({ prompt: localPrompt() })}
            placeholder={language.t("settings.agents.row.prompt.placeholder")}
            class="text-12-regular w-full"
            spellcheck={false}
            autocorrect="off"
            autocomplete="off"
            autocapitalize="off"
            rows={4}
          />
        </div>
      </SettingsList>
    </div>
  )
}

export const SettingsAgents: Component = () => {
  const language = useLanguage()

  return (
    <div class="flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-10 sm:px-10 sm:pb-10">
      <div class="sticky top-0 z-10 bg-[linear-gradient(to_bottom,var(--surface-stronger-non-alpha)_calc(100%_-_24px),transparent)]">
        <div class="flex flex-col gap-1 pt-6 pb-8">
          <h2 class="text-16-medium text-text-strong">{language.t("settings.agents.title")}</h2>
          <p class="text-12-regular text-text-weak">{language.t("settings.agents.header.description")}</p>
        </div>
      </div>

      <div class="flex flex-col gap-8 w-full max-w-[720px]">
        <For each={AGENT_NAMES}>{(name) => <AgentSection name={name} />}</For>
      </div>
    </div>
  )
}
