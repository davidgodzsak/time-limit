import {
  Plus,
  FolderOpen,
  Clock,
  MousePointerClick,
  Trash2,
  Edit2,
  Hourglass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/utils/i18n";
import type { UISite, UIGroup } from "@/lib/storage";

type Site = UISite;
type Group = UIGroup & { sites: UISite[] };

interface GroupsTabProps {
  groups: Group[];
  isSaving: boolean;
  onCreateGroup: () => void;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddSiteToGroup: (group: Group) => void;
  onRemoveSiteFromGroup: (groupId: string, siteId: string) => void;
}

export function GroupsTab({
  groups,
  isSaving,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  onAddSiteToGroup,
  onRemoveSiteFromGroup,
}: GroupsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("groups_section_title")}</h2>
          <p className="text-muted-foreground">
            {t("groups_section_description")}
          </p>
        </div>
        <Button
          className="rounded-xl shadow-soft"
          onClick={onCreateGroup}
          disabled={isSaving}
        >
          <Plus size={18} className="mr-2" />
          {t("groups_button_new")}
        </Button>
      </div>

      <div className="grid gap-4">
        {groups.map((group) => (
          <Card key={group.id} className="shadow-soft border-0">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl ${group.color} flex items-center justify-center`}
                >
                  <FolderOpen size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{group.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("groups_sites_count", String((group.sites || []).length))}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(group.sites || []).map((site) => (
                      <Badge
                        key={site.id}
                        variant="secondary"
                        className="rounded-full gap-1.5 pr-1"
                      >
                        <span>{site.favicon}</span>
                        {site.name}
                        <button
                          className="ml-1 hover:bg-background rounded-full p-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() =>
                            onRemoveSiteFromGroup(group.id, site.id)
                          }
                          disabled={isSaving}
                        >
                          <Trash2 size={10} />
                        </button>
                      </Badge>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full h-6 text-xs"
                      onClick={() => onAddSiteToGroup(group)}
                      disabled={isSaving}
                      data-testid={group.name === "Social Media" ? "social-media-add-site" : undefined}
                    >
                      <Plus size={12} className="mr-1" />
                      {t("groups_badge_add")}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 text-right space-y-1">
                  {group.timeLimit > 0 && (
                    <div className="flex items-center gap-2 text-sm justify-end">
                      <Clock size={14} className="text-muted-foreground" />
                      <span className="font-medium">
                        {t("groups_timeLimit_label", String(group.timeLimit))}
                      </span>
                    </div>
                  )}
                  {group.opensLimit && group.opensLimit > 0 && (
                    <div className="flex items-center gap-2 text-sm justify-end">
                      <MousePointerClick
                        size={14}
                        className="text-muted-foreground"
                      />
                      <span className="font-medium">
                        {t("groups_opensLimit_label", String(group.opensLimit))}
                      </span>
                    </div>
                  )}
                  {group.reflectionDelay && group.reflectionDelay > 0 && (
                    <div className="flex items-center gap-2 text-sm justify-end">
                      <Hourglass size={14} className="text-muted-foreground" />
                      <span className="font-medium">
                        {t(
                          "groups_reflectionDelay_label",
                          String(group.reflectionDelay)
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => onEditGroup(group)}
                    disabled={isSaving}
                    title={t("groups_button_edit_title")}
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => onDeleteGroup(group.id)}
                    disabled={isSaving}
                    title={t("groups_button_delete_title")}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
