import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Clock,
  MousePointerClick,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Hourglass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { t } from "@/lib/utils/i18n";
import type { UISite, UIGroup } from "@/lib/storage";

type Site = UISite;
type Group = UIGroup & { sites: UISite[] };

interface IndividualSitesTabProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  individualSites: Site[];
  groups: Group[];
  isSaving: boolean;
  onAddSite: () => void;
  onEditSite: (site: Site) => void;
  onRemoveSite: (siteId: string) => void;
  onToggleSiteEnabled: (siteId: string, currentValue: boolean) => void;
  onToggleGroupEnabled: (groupId: string, currentValue: boolean) => void;
  onToggleGroup: (groupId: string) => void;
  onRemoveSiteFromGroup: (groupId: string, siteId: string) => void;
  onAddSiteToGroup: (group: Group) => void;
  getFilteredSites: () => Site[];
  getFilteredGroups: () => Group[];
}

export function IndividualSitesTab({
  searchQuery,
  onSearchChange,
  individualSites,
  groups,
  isSaving,
  onAddSite,
  onEditSite,
  onRemoveSite,
  onToggleSiteEnabled,
  onToggleGroupEnabled,
  onToggleGroup,
  onRemoveSiteFromGroup,
  onAddSiteToGroup,
  getFilteredSites,
  getFilteredGroups,
}: IndividualSitesTabProps) {
  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder={t("sites_search_placeholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-11 rounded-xl border-0 bg-card shadow-soft"
        />
      </div>

      {/* Individual Sites */}
      <Card className="shadow-soft border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{t("sites_section_title")}</CardTitle>
              <Badge variant="secondary" className="rounded-full">
                {individualSites.length}
              </Badge>
            </div>
            <Button
              className="rounded-xl"
              size="sm"
              onClick={onAddSite}
              disabled={isSaving}
              data-testid="add-site-button"
            >
              <Plus size={16} className="mr-2" />
              {t("sites_button_add")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {getFilteredSites().map((site) => (
            <div
              key={site.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
            >
              <GripVertical
                size={16}
                className="text-muted-foreground/50 cursor-grab"
              />
              <span className="text-xl">{site.favicon}</span>
              <span className="flex-1 font-medium">{site.name}</span>
              {site.timeLimit && (
                <Badge variant="outline" className="rounded-full gap-1">
                  <Clock size={12} />
                  {site.timeLimit} min
                </Badge>
              )}
              {site.opensLimit && (
                <Badge variant="outline" className="rounded-full gap-1">
                  <MousePointerClick size={12} />
                  {site.opensLimit} opens
                </Badge>
              )}
              {site.reflectionDelay && (
                <Badge variant="outline" className="rounded-full gap-1">
                  <Hourglass size={12} />
                  {t("badge_reflectionDelay", String(site.reflectionDelay))}
                </Badge>
              )}
              <Switch
                checked={site.isEnabled !== false}
                onCheckedChange={() =>
                  onToggleSiteEnabled(site.id, site.isEnabled !== false)
                }
                disabled={isSaving}
                title={site.isEnabled !== false ? t("sites_button_enabled") : t("sites_button_disabled")}
              />
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEditSite(site)}
                  disabled={isSaving}
                >
                  <Edit2 size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onRemoveSite(site.id)}
                  disabled={isSaving}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Groups Overview */}
      {getFilteredGroups().length > 0 && (
        <Card className="shadow-soft border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {t("sites_groups_section_title")}
              <Badge variant="secondary" className="rounded-full">
                {groups.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {getFilteredGroups().map((group) => (
              <div
                key={group.id}
                className="rounded-2xl border bg-card overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                  <button
                    onClick={() => onToggleGroup(group.id)}
                    className="flex-1 flex items-center gap-3"
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${group.color}`}
                    />
                    <span className="font-semibold text-left">
                      {group.name}
                    </span>
                    {group.timeLimit > 0 && (
                      <Badge variant="outline" className="rounded-full gap-1">
                        <Clock size={12} />
                        {group.timeLimit} min
                      </Badge>
                    )}
                    {group.opensLimit && group.opensLimit > 0 && (
                      <Badge variant="outline" className="rounded-full gap-1">
                        <MousePointerClick size={12} />
                        {group.opensLimit}
                      </Badge>
                    )}
                    {group.reflectionDelay && group.reflectionDelay > 0 && (
                      <Badge variant="outline" className="rounded-full gap-1">
                        <Hourglass size={12} />
                        {t("badge_reflectionDelay", String(group.reflectionDelay))}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="rounded-full">
                      {t("sites_groups_badge", String((group.sites || []).length))}
                    </Badge>
                    {group.expanded ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>
                  <Switch
                    checked={group.isEnabled !== false}
                    onCheckedChange={() =>
                      onToggleGroupEnabled(group.id, group.isEnabled !== false)
                    }
                    disabled={isSaving}
                    title={
                      group.isEnabled !== false ? "Enabled" : "Disabled"
                    }
                  />
                </div>
                {group.expanded && (
                  <div className="border-t bg-muted/30 p-3 space-y-2">
                    {(group.sites || []).map((site) => (
                      <div
                        key={site.id}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-card transition-colors group"
                      >
                        <span className="text-lg">{site.favicon}</span>
                        <span className="flex-1 text-sm">{site.name}</span>
                        {site.reflectionDelay && (
                          <Badge
                            variant="outline"
                            className="rounded-full gap-1 text-xs"
                          >
                            <Hourglass size={10} />
                            {t(
                              "badge_reflectionDelay",
                              String(site.reflectionDelay)
                            )}
                          </Badge>
                        )}
                        <Switch
                          checked={site.isEnabled !== false}
                          onCheckedChange={() =>
                            onToggleSiteEnabled(
                              site.id,
                              site.isEnabled !== false
                            )
                          }
                          disabled={isSaving}
                          title={
                            site.isEnabled !== false
                              ? "Enabled"
                              : "Disabled"
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() =>
                            onRemoveSiteFromGroup(group.id, site.id)
                          }
                          disabled={isSaving}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full border-dashed border rounded-xl text-muted-foreground"
                      onClick={() => onAddSiteToGroup(group)}
                      disabled={isSaving}
                    >
                      <Plus size={14} className="mr-2" />
                      {t("sites_groups_addSite_button")}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
