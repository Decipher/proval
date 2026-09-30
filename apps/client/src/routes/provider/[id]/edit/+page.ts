import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import fetchApi from "$lib/utils";
import type { AccessResponse, ModelProviderResponse } from "@proval/types";

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
    const id = params.id;
    const [accessRes, modelRes] = await Promise.all([fetchApi(`/access/${id}`), fetchApi("/model-provider")]);

    if (!accessRes.ok) {
        error(accessRes.status === 404 ? 404 : 500, "Access configuration not found");
    }

    const access: AccessResponse = await accessRes.json();
    const modelList: ModelProviderResponse[] = modelRes.ok ? await modelRes.json() : [];

    return { access, modelList };
};
