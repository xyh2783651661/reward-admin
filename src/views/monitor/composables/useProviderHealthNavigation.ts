import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

type ProviderHealthTab = "status" | "checkRecord" | "alertRecord";

const validTabs: ProviderHealthTab[] = ["status", "checkRecord", "alertRecord"];

export function useProviderHealthNavigation() {
  const route = useRoute();
  const router = useRouter();
  const queryTab = String(route.query.tab ?? "status") as ProviderHealthTab;
  const activeTab = ref<ProviderHealthTab>(
    validTabs.includes(queryTab) ? queryTab : "status"
  );
  const activeProvider = ref(String(route.query.provider ?? ""));
  const pendingProvider = ref(activeProvider.value);

  function syncQuery() {
    const query = { ...route.query };
    delete query.tab;
    delete query.provider;
    if (activeTab.value !== "status") query.tab = activeTab.value;
    if (activeProvider.value) query.provider = activeProvider.value;
    void router.replace({ query });
  }

  function gotoCheckRecord(provider = "") {
    activeProvider.value = provider;
    pendingProvider.value = provider;
    activeTab.value = "checkRecord";
    syncQuery();
  }

  function gotoAlertRecord(provider = "") {
    activeProvider.value = provider;
    pendingProvider.value = provider;
    activeTab.value = "alertRecord";
    syncQuery();
  }

  function consumeProvider() {
    pendingProvider.value = "";
  }

  function clearProviderContext() {
    activeProvider.value = "";
    pendingProvider.value = "";
    syncQuery();
  }

  function showStatus() {
    activeTab.value = "status";
    clearProviderContext();
  }

  function handleTabChange() {
    if (activeTab.value === "status") {
      activeProvider.value = "";
      pendingProvider.value = "";
    } else {
      pendingProvider.value = activeProvider.value;
    }
    syncQuery();
  }

  return {
    activeTab,
    activeProvider,
    pendingProvider,
    gotoCheckRecord,
    gotoAlertRecord,
    consumeProvider,
    clearProviderContext,
    showStatus,
    handleTabChange
  };
}
