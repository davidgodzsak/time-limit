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

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (group: {
    name: string;
    color: string;
    timeLimit?: number;
    opensLimit?: number;
    reflectionDelay?: number;
    isBlocked?: boolean;
  }) => void;
  initialGroup?: {
    id: string;
    name: string;
    color: string;
    timeLimit: number;
    opensLimit?: number;
    reflectionDelay?: number;
    isBlocked?: boolean;
  };
  isEditing?: boolean;
}

const colorOptions = [
  { name: "Blue", value: "bg-blue-500" },
  { name: "Red", value: "bg-red-500" },
  { name: "Green", value: "bg-emerald-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Pink", value: "bg-pink-500" },
];

const CreateGroupDialog = ({ open, onOpenChange, onCreate, initialGroup, isEditing }: CreateGroupDialogProps) => {
  const [groupName, setGroupName] = useState(initialGroup?.name || "");
  const [selectedColor, setSelectedColor] = useState(initialGroup?.color || "bg-blue-500");
  const [timeLimit, setTimeLimit] = useState((initialGroup?.timeLimit || 30).toString());
  const [opensLimit, setOpensLimit] = useState((initialGroup?.opensLimit || "").toString());
  const [reflectionDelay, setReflectionDelay] = useState<number | undefined>(
    initialGroup?.reflectionDelay
  );
  const [isBlocked, setIsBlocked] = useState(initialGroup?.isBlocked === true);

  // Update form when dialog opens with initialGroup data
  useEffect(() => {
    if (open) {
      if (initialGroup) {
        setGroupName(initialGroup.name);
        setSelectedColor(initialGroup.color);
        setTimeLimit(initialGroup.timeLimit ? initialGroup.timeLimit.toString() : "");
        setOpensLimit((initialGroup.opensLimit || "").toString());
        setReflectionDelay(initialGroup.reflectionDelay || undefined);
        setIsBlocked(initialGroup.isBlocked === true);
      } else {
        // Reset form for create mode
        setGroupName("");
        setSelectedColor("bg-blue-500");
        setTimeLimit("30");
        setOpensLimit("");
        setReflectionDelay(undefined);
        setIsBlocked(false);
      }
    }
  }, [open, initialGroup]);

  const handleCreate = () => {
    if (!groupName.trim()) {
      return;
    }

    const parsedTimeLimit = timeLimit ? parseInt(timeLimit) : undefined;
    const parsedOpensLimit = opensLimit ? parseInt(opensLimit) : undefined;

    // A reflection delay and a full block each count as a rule of their own, so
    // any one of the four is enough.
    if (!parsedTimeLimit && !parsedOpensLimit && !reflectionDelay && !isBlocked) {
      alert(t("dialog_createGroup_validation"));
      return;
    }

    // A group can have only an opens limit (no time limit) in both create and
    // edit modes, as long as at least one limit is set (validated above).
    onCreate({
      name: groupName.trim(),
      color: selectedColor,
      timeLimit: parsedTimeLimit, // undefined = no time limit
      opensLimit: parsedOpensLimit, // undefined = no opens limit
      reflectionDelay, // undefined = opens straight away
      isBlocked, // true = nothing in this group opens at all
    });
    setGroupName("");
    setSelectedColor("bg-blue-500");
    setTimeLimit("30");
    setOpensLimit("");
    setReflectionDelay(undefined);
    setIsBlocked(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("dialog_createGroup_title_edit") : t("dialog_createGroup_title_create")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("dialog_createGroup_description_edit") : t("dialog_createGroup_description_create")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">{t("dialog_createGroup_label_groupName")}</Label>
            <Input
              id="group-name"
              placeholder={t("dialog_createGroup_placeholder_groupName")}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="rounded-xl"
            />
          </div>
          
          {/* Color picker */}
          <div className="space-y-2">
            <Label>{t("dialog_createGroup_label_color")}</Label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full ${color.value} transition-all ${
                    selectedColor === color.value
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "hover:scale-110"
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="group-block"
                className="flex items-center gap-2 text-destructive"
              >
                <Ban size={14} />
                {t("dialog_createGroup_label_blockCompletely")}
              </Label>
              <Switch
                id="group-block"
                checked={isBlocked}
                onCheckedChange={setIsBlocked}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("dialog_createGroup_hint_blockCompletely")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="group-time-limit" className="flex items-center gap-2">
                <Clock size={14} />
                {t("dialog_createGroup_label_timeLimit")}
              </Label>
              <Input
                id="group-time-limit"
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                disabled={isBlocked}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-opens-limit" className="flex items-center gap-2">
                <MousePointerClick size={14} />
                {t("dialog_createGroup_label_opensLimit")}
              </Label>
              <Input
                id="group-opens-limit"
                type="number"
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
              {t("dialog_createGroup_label_reflectionDelay")}
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
                : t("dialog_createGroup_hint_reflectionDelay")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            {t("dialog_createGroup_button_cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              !groupName.trim() ||
              (!timeLimit && !opensLimit && !reflectionDelay && !isBlocked)
            }
            className="rounded-xl"
          >
            {isEditing ? (
              <>{t("dialog_createGroup_button_update")}</>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                {t("dialog_createGroup_button_create")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
