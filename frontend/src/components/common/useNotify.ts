import { useSnackbar } from "notistack";
import { useCallback } from "react";

export function useNotify() {
  const { enqueueSnackbar } = useSnackbar();

  const success = useCallback(
    (message: string) => enqueueSnackbar(message, { variant: "success" }),
    [enqueueSnackbar]
  );

  const error = useCallback(
    (message: string) => enqueueSnackbar(message, { variant: "error" }),
    [enqueueSnackbar]
  );

  return { success, error };
}
