import { Plus, Quote, Edit2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/utils/i18n";

interface Message {
  id: string;
  text: string;
}

interface MessagesTabProps {
  messages: Message[];
  newMessage: string;
  onNewMessageChange: (text: string) => void;
  onAddMessage: () => void;
  isSaving: boolean;
  onRemoveMessage: (messageId: string) => void;
  onStartEditMessage: (message: Message) => void;
  editingMessageId: string | null;
  editingMessageText: string;
  onEditMessageChange: (text: string) => void;
  onSaveEditMessage: () => void;
  onCancelEditMessage: () => void;
}

export function MessagesTab({
  messages,
  newMessage,
  onNewMessageChange,
  onAddMessage,
  isSaving,
  onRemoveMessage,
  onStartEditMessage,
  editingMessageId,
  editingMessageText,
  onEditMessageChange,
  onSaveEditMessage,
  onCancelEditMessage,
}: MessagesTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("messages_section_title")}</h2>
        <p className="text-muted-foreground">
          {t("messages_section_description")}
        </p>
      </div>

      <Card className="shadow-soft border-0">
        <CardContent className="p-5 space-y-4">
          {/* Add new message */}
          <div className="flex gap-3">
            <Input
              placeholder={t("messages_input_placeholder")}
              value={newMessage}
              onChange={(e) => onNewMessageChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAddMessage()}
              className="rounded-xl"
              disabled={isSaving}
            />
            <Button
              onClick={onAddMessage}
              className="rounded-xl"
              disabled={isSaving || !newMessage.trim()}
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} />
              )}
            </Button>
          </div>

          {/* Messages list */}
          <div className="space-y-2" data-testid="messages-list">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 group"
              >
                <Quote size={18} className="text-primary shrink-0" />
                {editingMessageId === message.id ? (
                  <Input
                    value={editingMessageText}
                    onChange={(e) => onEditMessageChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSaveEditMessage();
                      if (e.key === "Escape") onCancelEditMessage();
                    }}
                    className="flex-1 rounded-xl"
                    autoFocus
                    disabled={isSaving}
                  />
                ) : (
                  <p
                    className="flex-1 cursor-text"
                    onClick={() => onStartEditMessage(message)}
                  >
                    {message.text}
                  </p>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  {editingMessageId === message.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={onSaveEditMessage}
                        disabled={isSaving || !editingMessageText.trim()}
                      >
                        ✓
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={onCancelEditMessage}
                        disabled={isSaving}
                      >
                        ✕
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onStartEditMessage(message)}
                        disabled={isSaving}
                        title={t("messages_button_edit_title")}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onRemoveMessage(message.id)}
                        disabled={isSaving}
                        title={t("messages_button_delete_title")}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
