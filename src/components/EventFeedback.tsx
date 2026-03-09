import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  eventId: string;
  isCreator: boolean;
  /** Only confirmed attendees can leave feedback */
  canLeaveFeedback: boolean;
};

type FeedbackRow = {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
};

const EventFeedback = ({ eventId, isCreator, canLeaveFeedback }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const feedbackQuery = useQuery({
    queryKey: ["event-feedback", eventId],
    queryFn: async (): Promise<FeedbackRow[]> => {
      const { data, error } = await supabase
        .from("event_feedback" as any)
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const feedbacks = (data ?? []) as any[];

      const userIds = feedbacks.map((f: any) => f.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return feedbacks.map((f: any) => ({
        ...f,
        profile: profileMap.get(f.user_id) ?? null,
      }));
    },
  });

  const existingFeedback = (feedbackQuery.data ?? []).find((f) => f.user_id === user?.id);
  const avgRating = feedbackQuery.data?.length
    ? (feedbackQuery.data.reduce((sum, f) => sum + f.rating, 0) / feedbackQuery.data.length).toFixed(1)
    : null;

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error("Selecciona una calificación");
      return;
    }

    setSubmitting(true);
    try {
      if (existingFeedback) {
        const { error } = await supabase
          .from("event_feedback" as any)
          .update({ rating, comment: comment.trim() } as any)
          .eq("id", existingFeedback.id);
        if (error) throw error;
        toast.success("Feedback actualizado");
      } else {
        const { error } = await supabase
          .from("event_feedback" as any)
          .insert({ event_id: eventId, user_id: user.id, rating, comment: comment.trim() } as any);
        if (error) throw error;
        toast.success("¡Gracias por tu feedback!");
      }
      queryClient.invalidateQueries({ queryKey: ["event-feedback", eventId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al enviar feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value: number, interactive = false) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 transition-colors ${
            star <= (interactive ? (hoverRating || rating) : value)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          } ${interactive ? "cursor-pointer" : ""}`}
          onClick={interactive ? () => setRating(star) : undefined}
          onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
          onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Feedback
        </h3>
        {avgRating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            {avgRating} ({feedbackQuery.data?.length} reseña{feedbackQuery.data?.length !== 1 ? "s" : ""})
          </div>
        )}
      </div>

      {/* Leave feedback form */}
      {canLeaveFeedback && !isCreator && (
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">
            {existingFeedback ? "Actualizar tu reseña" : "¿Cómo fue tu experiencia?"}
          </p>
          {renderStars(rating, true)}
          <Textarea
            placeholder="Comparte tu experiencia (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />
          <Button size="sm" onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting ? "Enviando..." : existingFeedback ? "Actualizar" : "Enviar"}
          </Button>
        </div>
      )}

      {/* Feedback list */}
      {(feedbackQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aún no hay reseñas.</p>
      ) : (
        <div className="space-y-3">
          {(feedbackQuery.data ?? []).map((fb, i) => (
            <motion.div
              key={fb.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={fb.profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {(fb.profile?.full_name ?? "V").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-card-foreground">
                  {fb.profile?.full_name ?? "Voluntario"}
                </span>
                {renderStars(fb.rating)}
              </div>
              {fb.comment && <p className="text-sm text-muted-foreground ml-9">{fb.comment}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventFeedback;
