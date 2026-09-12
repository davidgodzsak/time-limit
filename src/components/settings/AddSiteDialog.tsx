import { useState, useEffect } from "react";
import { Plus, Clock, MousePointerClick, Hourglass, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/utils/i18n";
import { ReflectionDelayPicker } from "@/components/ReflectionDelayPicker";

interface AddSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (site: {
    name: string;
    timeLimit?: number;
    opensLimit?: number;
    reflectionDelay?: number;
    isBlocked?: boolean;
  }) => void;
  initialSite?: {
    id: string;
    name: string;
    timeLimit?: number;
    opensLimit?: number;
    reflectionDelay?: number;
    isBlocked?: boolean;
  };
  isEditing?: boolean;
}

const AddSiteDialog = ({ open, onOpenChange, onAdd, initialSite, isEditing }: AddSiteDialogProps) => {
  const [siteName, setSiteName] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [opensLimit, setOpensLimit] = useState("");
  const [reflectionDelay, setReflectionDelay] = useState<number | undefined>(undefined);
  const [isBlocked, setIsBlocked] = useState(false);

  // Update form when dialog opens/closes or when editing site changes
  useEffect(() => {
    if (open && isEditing && initialSite) {
      setSiteName(initialSite.name);
      setTimeLimit(initialSite.timeLimit ? initialSite.timeLimit.toString() : "");
      setOpensLimit(initialSite.opensLimit ? initialSite.opensLimit.toString() : "");
      setReflectionDelay(initialSite.reflectionDelay || undefined);
      setIsBlocked(initialSite.isBlocked === true);
    } else if (open && !isEditing) {
      setSiteName("");
      setTimeLimit("");
      setOpensLimit("");
      setReflectionDelay(undefined);
      setIsBlocked(false);
    }
  }, [open, isEditing, initialSite]);

  const handleAdd = () => {
    if (!siteName.trim()) {
      return;
    }

    const parsedTimeLimit = timeLimit ? parseInt(timeLimit) : undefined;
    const parsedOpensLimit = opensLimit ? parseInt(opensLimit) : undefined;

    // A reflection delay and a full block each count as a rule of their own, so
    // any one of the four is enough.
    if (!parsedTimeLimit && !parsedOpensLimit && !reflectionDelay && !isBlocked) {
      alert(t("dialog_addSite_validation"));
      return;
    }

    // The other limits are kept as they are, so turning the block off later
    // restores them — they simply do nothing while the block is on.
    onAdd({
      name: siteName.trim(),
      timeLimit: parsedTimeLimit,
      opensLimit: parsedOpensLimit,
      reflectionDelay,
      isBlocked,
    });
    setSiteName("");
    setTimeLimit("");
    setOpensLimit("");
    setReflectionDelay(undefined);
    setIsBlocked(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("dialog_addSite_title_edit") : t("dialog_addSite_title_create")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("dialog_addSite_description_edit") : t("dialog_addSite_description_create")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="site-name">{t("dialog_addSite_label_websiteUrl")}</Label>
            <Input
              id="site-name"
              placeholder={t("dialog_addSite_placeholder_websiteUrl")}
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              {t("dialog_addSite_hint_scope")}
            </p>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="site-block"
                className="flex items-center gap-2 text-destructive"
              >
                <Ban size={14} />
                {t("dialog_addSite_label_blockCompletely")}
              </Label>
              <Switch
                id="site-block"
                checked={isBlocked}
                onCheckedChange={setIsBlocked}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("dialog_addSite_hint_blockCompletely")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time-limit" className="flex items-center gap-2">
                <Clock size={14} />
                {t("dialog_addSite_label_timeLimit")}
              </Label>
              <Input
                id="time-limit"
                type="number"
                placeholder={t("dialog_addSite_placeholder_timeLimit")}
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                disabled={isBlocked}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opens-limit" className="flex items-center gap-2">
                <MousePointerClick size={14} />
                {t("dialog_addSite_label_opensLimit")}
              </Label>
              <Input
                id="opens-limit"
                type="number"
                placeholder={t("dialog_addSite_placeholder_opensLimit")}
                value={opensLimit}
                onChange={(e) => setOpensLimit(e.target.value)}
                disabled={isBlocked}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Hourglass size={14} />
              {t("dialog_addSite_label_reflectionDelay")}
            </Label>
            <ReflectionDelayPicker
              value={reflectionDelay}
              onChange={setReflectionDelay}
              includeOff
              disabled={isBlocked}
            />
            <p className="text-xs text-muted-foreground">
              {isBlocked
                ? t("dialog_addSite_blocked_note")
                : t("dialog_addSite_hint_reflectionDelay")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            {t("dialog_addSite_button_cancel")}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={
              !siteName.trim() ||
              (!timeLimit && !opensLimit && !reflectionDelay && !isBlocked)
            }
            className="rounded-xl"
          >
            {isEditing ? (
              <>{t("dialog_addSite_button_update")}</>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                {t("dialog_addSite_button_add")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSiteDialog;
