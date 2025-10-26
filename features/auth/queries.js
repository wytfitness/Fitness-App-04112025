import { useMutation } from "@tanstack/react-query";
import { AuthAPI } from "./api";

export const useLogin = () =>
  useMutation({
    mutationFn: AuthAPI.login,
  });