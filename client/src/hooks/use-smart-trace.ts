import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type GenerateBatchRequest, type VerifyProductRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// ============================================
// BATCHES HOOKS
// ============================================

export function useBatches() {
  return useQuery({
    queryKey: [api.batches.list.path],
    queryFn: async () => {
      const res = await fetch(api.batches.list.path);
      if (!res.ok) throw new Error("Failed to fetch batches");
      return api.batches.list.responses[200].parse(await res.json());
    },
  });
}

export function useGenerateBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: GenerateBatchRequest) => {
      const res = await fetch(api.batches.generate.path, {
        method: api.batches.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.batches.generate.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to generate batch");
      }
      return api.batches.generate.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.batches.list.path] });
      toast({
        title: "Batch Generated Successfully",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ============================================
// VERIFICATION HOOKS
// ============================================

export function useVerifyProduct() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: VerifyProductRequest) => {
      const res = await fetch(api.verify.check.path, {
        method: api.verify.check.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.verify.check.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Verification failed");
      }
      return api.verify.check.responses[200].parse(await res.json());
    },
    onError: (error) => {
      toast({
        title: "Verification Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
