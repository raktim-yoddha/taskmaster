import React, { useState, useEffect } from "react";
import { 
  UpdateInfo, 
  CURRENT_VERSION, 
  openExternalUrl,
  getAppInstallInfo,
  applyInPlaceUpdate,
  AppInstallInfo,
  DownloadProgress
} from "../utils/updater";
import { listen } from "@tauri-apps/api/event";
import { 
  Sparkles, 
  Download, 
  X, 
  ArrowUpRight, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  ShieldCheck
} from "lucide-react";

interface UpdateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  onDismissVersion?: (version: string) => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  onDismissVersion,
}) => {
  const [installInfo, setInstallInfo] = useState<AppInstallInfo>({ is_portable: true, exe_path: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [statusText, setStatusText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAppInstallInfo().then(setInstallInfo).catch(() => {});
      setIsUpdating(false);
      setProgress(null);
      setErrorMsg(null);
      setStatusText("");
    }
  }, [isOpen]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    if (isUpdating) {
      listen<DownloadProgress>("update-download-progress", (event) => {
        if (event.payload) {
          setProgress(event.payload);
          if (event.payload.percentage >= 100) {
            setStatusText("Update downloaded! Restarting Taskmaster...");
          } else {
            setStatusText(`Downloading update... ${event.payload.percentage}%`);
          }
        }
      })
        .then((fn) => {
          unlisten = fn;
        })
        .catch((err) => {
          console.warn("Failed to listen for update progress:", err);
        });
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, [isUpdating]);

  if (!isOpen || !updateInfo) return null;

  // Identify specific binaries from release assets
  const setupAsset = updateInfo.assets.find(
    (a) => a.name.toLowerCase().endsWith("-setup.exe") || (a.name.toLowerCase().includes("setup") && a.name.toLowerCase().endsWith(".exe"))
  );
  const portableAsset = updateInfo.assets.find(
    (a) => a.name.toLowerCase().includes("portable") && a.name.toLowerCase().endsWith(".exe")
  );
  const msiAsset = updateInfo.assets.find((a) => a.name.toLowerCase().endsWith(".msi"));

  const handleAutoUpdate = async () => {
    if (!updateInfo) return;
    setErrorMsg(null);
    setIsUpdating(true);
    setStatusText("Connecting to download servers...");

    // Pick the exact matching asset so the user's running app is updated in-place without creating a 2nd app
    const targetAsset = installInfo.is_portable 
      ? (portableAsset || setupAsset) 
      : (setupAsset || portableAsset);

    const downloadUrl = targetAsset?.downloadUrl || updateInfo.releaseUrl;
    const totalBytes = targetAsset?.size || 0;

    try {
      await applyInPlaceUpdate(downloadUrl, totalBytes, installInfo.is_portable);
    } catch (err: any) {
      console.error("Auto-update failed:", err);
      setIsUpdating(false);
      setErrorMsg(typeof err === "string" ? err : err?.message || "Update installation failed");
    }
  };

  const handleManualDownload = async (url: string) => {
    await openExternalUrl(url);
  };

  const handleRemindLater = () => {
    if (onDismissVersion) {
      onDismissVersion(updateInfo.version);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg liquid-glass-card rounded-[22px] border border-white/10 shadow-2xl overflow-hidden flex flex-col text-neutral-200"
        style={{
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px -5px rgba(255, 87, 51, 0.15)",
        }}
      >
        {/* Header with gradient badge */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-white/[0.06] bg-gradient-to-b from-[#ff5733]/[0.08] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff5733]/20 border border-[#ff5733]/40 flex items-center justify-center text-[#ff5733] shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Update Available
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ff5733]/20 text-[#ff5733] border border-[#ff5733]/30">
                  v{updateInfo.version}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                <span>Current: <strong className="font-mono text-neutral-300">v{CURRENT_VERSION}</strong></span>
                <span>•</span>
                <span className="text-[11px] text-neutral-300 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3 text-[#ff5733]" />
                  {installInfo.is_portable ? "Portable App Mode" : "Installed App Mode"}
                </span>
              </div>
            </div>
          </div>

          {!isUpdating && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body: Release Notes / Changelog */}
        <div className="px-6 py-4 flex-1 overflow-y-auto max-h-56 space-y-3 text-xs leading-relaxed">
          <div className="flex items-center justify-between text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
            <span>What's New in {updateInfo.title}</span>
          </div>

          <div className="p-4 rounded-2xl liquid-glass-row border border-white/[0.06] font-sans text-neutral-300 whitespace-pre-wrap select-text leading-relaxed">
            {updateInfo.notes}
          </div>
        </div>

        {/* Error notice if update failed */}
        {errorMsg && (
          <div className="mx-6 mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-300">Auto-update couldn't complete:</p>
              <p className="text-[11px] text-red-200/90 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Primary Seamless In-Place Action */}
        <div className="px-6 py-4 bg-black/40 border-t border-white/[0.06] space-y-3">
          {isUpdating ? (
            /* Live In-App Download Progress Bar */
            <div className="w-full bg-white/[0.04] rounded-2xl p-4 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff5733]" />
                  {statusText}
                </span>
                {progress && progress.total_bytes > 0 && (
                  <span className="font-mono text-neutral-400 text-[11px]">
                    {(progress.downloaded_bytes / (1024 * 1024)).toFixed(1)} MB / {(progress.total_bytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>
              <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-white/[0.08]">
                <div
                  className="h-full bg-gradient-to-r from-[#ff5733] to-[#ff7a5c] rounded-full transition-all duration-150"
                  style={{ width: `${progress ? progress.percentage : 15}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-400">
                Updating your existing Taskmaster app in-place. Will automatically restart once finished.
              </p>
            </div>
          ) : (
            /* One-Click Update Button */
            <div>
              <button
                type="button"
                onClick={handleAutoUpdate}
                className="liquid-coral-btn w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.99] transition-all"
              >
                <Download className="w-4 h-4" />
                <span>
                  Update to v{updateInfo.version} Now ({installInfo.is_portable ? "In-Place" : "Clean Upgrade"})
                </span>
              </button>
              <p className="text-[11px] text-center text-neutral-400 mt-2">
                {installInfo.is_portable
                  ? "Updates this exact portable executable in-place. Does not create a duplicate app."
                  : "Seamlessly upgrades your installed Taskmaster app. Preserves all tasks & settings."}
              </p>
            </div>
          )}

          {/* Advanced: Manual Downloads Expandable */}
          {!isUpdating && (
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowManual(!showManual)}
                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer py-1"
              >
                <span>Manual Download Options (Advanced)</span>
                {showManual ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showManual && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/[0.04] animate-in fade-in duration-150">
                  {/* Setup .exe */}
                  <button
                    type="button"
                    onClick={() => handleManualDownload(setupAsset ? setupAsset.downloadUrl : updateInfo.releaseUrl)}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-[11px] font-medium flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer active:scale-95 transition-all"
                    title="Manual setup installer"
                  >
                    <Download className="w-3 h-3 text-[#ff5733]" />
                    <span>Setup (.exe)</span>
                  </button>

                  {/* Portable .exe */}
                  <button
                    type="button"
                    onClick={() => handleManualDownload(portableAsset ? portableAsset.downloadUrl : updateInfo.releaseUrl)}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-[11px] font-medium flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer active:scale-95 transition-all"
                    title="Manual standalone executable"
                  >
                    <Download className="w-3 h-3 text-neutral-400" />
                    <span>Portable (.exe)</span>
                  </button>

                  {/* MSI Setup */}
                  <button
                    type="button"
                    onClick={() => handleManualDownload(msiAsset ? msiAsset.downloadUrl : updateInfo.releaseUrl)}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-200 text-[11px] font-medium flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer active:scale-95 transition-all"
                    title="Manual MSI installer"
                  >
                    <Download className="w-3 h-3 text-neutral-400" />
                    <span>MSI (.msi)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-[#121418] border-t border-white/[0.06] flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleManualDownload(updateInfo.releaseUrl)}
            className="text-xs text-[#ff5733] hover:text-[#ff6947] flex items-center gap-1 font-medium transition-colors cursor-pointer"
          >
            <span>View Release on GitHub</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          {!isUpdating && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRemindLater}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Remind Me Later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
