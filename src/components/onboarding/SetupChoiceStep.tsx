import { Fragment, forwardRef, useRef, useState } from "react";
import {
  AlertCircle,
  BanknoteCheck,
  GalleryVerticalEnd,
  KeyRound,
  Laptop,
  Server,
  ShieldCheck,
  WandSparkles,
  WifiOff,
  Zap,
} from "../icons";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { usePolicySnapshot } from "../../hooks/usePolicy";
import {
  getParakeetModelInfo,
  getTranscriptionProviders,
  modelRegistry,
} from "../../models/ModelRegistry";
import type { OnboardingSetupMode } from "./flow";
import { getOnboardingSetupAvailability, hasAvailableOnboardingSetup } from "./setupEligibility";
import { LOCAL_ASR_ORGANIZATIONS } from "../../helpers/localASROrganization";
import { getProviderIcon, isMonochromeProvider } from "@/utils/providerIcons";
import { cn } from "../lib/utils";
import warningBackdrop from "../../assets/onboarding-setup-warning-hero.webp";

type SetupMode = Exclude<OnboardingSetupMode, null>;

const REFERENCE_LOCAL_MODEL_ID = "nemotron-3.5-asr-streaming-0.6b";

interface SetupChoiceStepProps {
  agentAllowed: boolean;
  onSelect: (mode: SetupMode, options?: { selfHosted?: boolean }) => void;
}

function Feature({
  icon: Icon,
  accent = false,
  children,
}: {
  icon: typeof Zap;
  accent?: boolean;
  children: string;
}) {
  return (
    <li className="flex items-center gap-1.5 text-xs leading-[1.4] text-[var(--onboarding-text-primary)]">
      <Icon
        className={`size-3 shrink-0 ${accent ? "text-[var(--onboarding-accent)]" : "text-[var(--onboarding-text-tertiary)]"}`}
      />
      {children}
    </li>
  );
}

function SetupCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex h-[350px] w-68 shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-[var(--onboarding-control-border)] bg-[var(--onboarding-surface)] px-4 pb-5 pt-4 text-start">
      {children}
    </section>
  );
}

const CardAction = forwardRef<
  HTMLButtonElement,
  {
    brand?: boolean;
    className?: string;
    onClick: () => void;
    children: string;
  }
>(function CardAction({ brand = false, className = "", onClick, children }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`onboarding-pressable relative z-10 w-full rounded-[38px] px-4 py-1.5 text-xs font-medium leading-[1.4] ${className} ${
        brand
          ? "bg-[var(--onboarding-accent)] text-[var(--onboarding-accent-foreground)] hover:brightness-95"
          : "border border-[var(--onboarding-control-border)] text-[var(--onboarding-text-primary)] hover:bg-[var(--onboarding-surface-hover)]"
      }`}
    >
      {children}
    </button>
  );
});

export default function SetupChoiceStep({
  agentAllowed,
  onSelect,
}: SetupChoiceStepProps) {
  const { t } = useTranslation();
  const policy = usePolicySnapshot();
  const [pending, setPending] = useState<"local" | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const localReferenceModel = getParakeetModelInfo(REFERENCE_LOCAL_MODEL_ID);
  const localModelSize = (localReferenceModel?.size ?? t("common.unknown")).replace(
    /(\d)([A-Za-z])/,
    "$1 $2"
  );
  const minimumLocalSpaceGb = Math.max(2, Math.ceil((localReferenceModel?.sizeMb ?? 0) / 1000));

  const availability = getOnboardingSetupAvailability({
    policy,
    agentAllowed,
    transcriptionProviders: getTranscriptionProviders(),
    llmProviders: modelRegistry.getCloudProviders(),
  });
  const {
    local: localAllowed,
    byok: byokAllowed,
    selfHosted: selfHostedAllowed,
  } = availability;

  const confirmPending = () => {
    if (!pending) return;
    onSelect(pending);
    setPending(null);
  };

  const handleWarningAutoFocus = (event: Event) => {
    event.preventDefault();
    confirmRef.current?.focus();
  };

  const warningSteps = pending
    ? [1, 2, 3].map((step) =>
        t(`onboarding.rehaul.setupChoice.warnings.${pending}.steps.${step}`, {
          modelSize: localModelSize,
        })
      )
    : [];

  return (
    <div className="mx-auto mt-5 flex w-full flex-col items-center gap-4">
      <div className="onboarding-stagger flex items-start justify-center gap-3">
        {localAllowed && (
          <SetupCard>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="flex -space-x-2">
                  {LOCAL_ASR_ORGANIZATIONS.map(({ id }) => (
                    <span
                      key={id}
                      className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[var(--onboarding-inverse-surface)] ring-[1.33px] ring-[var(--onboarding-surface)]"
                    >
                      <img
                        src={getProviderIcon(id)}
                        alt=""
                        aria-hidden="true"
                        decoding="async"
                        draggable={false}
                        className={cn(
                          id === "nvidia" ? "size-full object-cover" : "size-4",
                          isMonochromeProvider(id) && "invert dark:invert-0"
                        )}
                      />
                    </span>
                  ))}
                </span>
                <span className="rounded-[47px] bg-[var(--onboarding-surface-tertiary)] px-[9px] py-1 text-[10px] leading-[1.4] text-[var(--onboarding-text-primary)]">
                  {t("onboarding.rehaul.setupChoice.local.badge")}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <h2 className="onboarding-card-title text-[var(--onboarding-text-primary)]">
                    {t("onboarding.rehaul.setupChoice.local.title")}
                  </h2>
                  <p className="text-sm leading-[1.4] text-[var(--onboarding-text-secondary)]">
                    {t("onboarding.rehaul.setupChoice.local.description", {
                      minimumSpace: minimumLocalSpaceGb,
                    })}
                  </p>
                </div>
                <ul className="flex flex-col gap-2">
                  <Feature icon={Laptop}>
                    {t("onboarding.rehaul.setupChoice.local.features.device")}
                  </Feature>
                  <Feature icon={WifiOff}>
                    {t("onboarding.rehaul.setupChoice.local.features.offline")}
                  </Feature>
                  <Feature icon={GalleryVerticalEnd}>
                    {t("onboarding.rehaul.setupChoice.local.features.models")}
                  </Feature>
                  <Feature icon={BanknoteCheck}>
                    {t("onboarding.rehaul.setupChoice.local.features.free")}
                  </Feature>
                </ul>
              </div>
            </div>
            <CardAction onClick={() => setPending("local")}>
              {t("onboarding.rehaul.setupChoice.local.download")}
            </CardAction>
          </SetupCard>
        )}

        {byokAllowed && (
          <SetupCard>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[183px] bg-gradient-to-t from-[color-mix(in_srgb,var(--onboarding-accent)_12%,transparent)] to-transparent"
              aria-hidden="true"
            />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-b from-[#4079ed] to-[#244587] text-white">
                  <KeyRound className="size-5" />
                </span>
                <span className="rounded-[47px] bg-[var(--onboarding-accent)] px-[9px] py-1 text-[10px] leading-[1.4] text-[var(--onboarding-accent-foreground)]">
                  {t("common.recommended")}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <h2 className="onboarding-card-title text-[var(--onboarding-text-primary)]">
                    {t("onboarding.rehaul.setupChoice.byok.title")}
                  </h2>
                  <p className="text-sm leading-[1.4] text-[var(--onboarding-text-secondary)]">
                    {t("onboarding.rehaul.setupChoice.byok.description")}
                  </p>
                </div>
                <ul className="flex flex-col gap-2">
                  <Feature icon={Zap} accent>
                    {t("onboarding.rehaul.setupChoice.cloud.features.fast")}
                  </Feature>
                  <Feature icon={ShieldCheck} accent>
                    {t("onboarding.rehaul.setupChoice.cloud.features.privacy")}
                  </Feature>
                  <Feature icon={WandSparkles} accent>
                    {t("onboarding.rehaul.setupChoice.cloud.features.features")}
                  </Feature>
                </ul>
              </div>
            </div>
            <CardAction brand onClick={() => onSelect("byok")}>
              {t("common.continue")}
            </CardAction>
          </SetupCard>
        )}
      </div>

      {selfHostedAllowed && (
        <button
          type="button"
          onClick={() => onSelect("byok", { selfHosted: true })}
          className="onboarding-pressable inline-flex items-center gap-1.5 rounded-[38px] border border-[var(--onboarding-control-border)] px-4 py-1.5 text-xs font-medium leading-[1.4] text-[var(--onboarding-text-primary)] hover:bg-[var(--onboarding-surface-hover)]"
        >
          <Server className="size-3.5 text-[var(--onboarding-accent)]" />
          {t("onboarding.rehaul.setupChoice.moreOptions.selfHosted.title")}
        </button>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent
          overlayClassName="bg-[var(--onboarding-scrim)]! backdrop-blur-[11px]"
          className="w-full max-w-sm gap-6 rounded-3xl border-0 bg-[var(--onboarding-surface)] px-4 pb-6 pt-5 text-start text-[var(--onboarding-text-primary)] [&>button]:hidden"
          onOpenAutoFocus={handleWarningAutoFocus}
        >
          <div
            className="flex h-[190px] items-center justify-center rounded-2xl bg-cover bg-center"
            style={{ backgroundImage: `url(${warningBackdrop})` }}
          >
            <div className="flex items-center gap-3.5">
              <span className="flex size-8 items-center justify-center rounded-full border border-[var(--onboarding-control-border)] bg-[color-mix(in_srgb,var(--onboarding-surface)_72%,transparent)] text-[var(--onboarding-text-tertiary)]">
                <KeyRound className="size-4" strokeWidth={1.25} />
              </span>
              <span className="flex size-[55px] items-center justify-center rounded-full border-[1.83px] border-[var(--onboarding-control-border)] bg-[var(--onboarding-surface)] text-[var(--onboarding-accent)]">
                <Laptop className="size-[22px]" strokeWidth={2.14} />
              </span>
              <span className="flex size-8 items-center justify-center rounded-full border border-[var(--onboarding-control-border)] bg-[color-mix(in_srgb,var(--onboarding-surface)_72%,transparent)] text-[var(--onboarding-text-tertiary)]">
                <Server className="size-4" strokeWidth={1.25} />
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-lg! font-semibold! leading-[1.4]! tracking-normal! text-[var(--onboarding-text-primary)]">
                {pending ? t(`onboarding.rehaul.setupChoice.warnings.${pending}.title`) : ""}
              </DialogTitle>
              <DialogDescription className="text-sm leading-[1.4] text-[var(--onboarding-text-secondary)]">
                {pending
                  ? t(`onboarding.rehaul.setupChoice.warnings.${pending}.description`, {
                      minimumSpace: minimumLocalSpaceGb,
                    })
                  : ""}
              </DialogDescription>
            </div>

            <ol className="flex flex-col">
              {warningSteps.map((step, index) => (
                <Fragment key={step}>
                  {index > 0 && (
                    <li className="h-[26.5px] w-7 shrink-0" aria-hidden="true">
                      <span className="mx-auto block h-full w-0 border-l border-dashed border-[var(--onboarding-surface-tertiary)]" />
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--onboarding-inverse-surface)] text-sm leading-[1.32] text-[var(--onboarding-inverse-text)]">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium leading-[1.32] text-[var(--onboarding-text-primary)]">
                      {step}
                    </span>
                  </li>
                </Fragment>
              ))}
            </ol>
          </div>

          <div className="flex gap-2.5">
            <CardAction
              className="flex-1"
              onClick={() => setPending(null)}
            >
              {t("common.cancel")}
            </CardAction>
            <CardAction ref={confirmRef} brand className="flex-1" onClick={confirmPending}>
              {pending
                ? t(`onboarding.rehaul.setupChoice.warnings.${pending}.continue`)
                : t("onboarding.rehaul.setupChoice.continueSetup")}
            </CardAction>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
