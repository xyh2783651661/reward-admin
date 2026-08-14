import { ref } from "vue";

type ProviderHealthTab = "status" | "checkRecord" | "alertRecord";

export function useProviderHealthNavigation() {
  const activeTab = ref<ProviderHealthTab>("status");
  const activeProvider = ref("");
  const activePoolName = ref("");
  const pendingProvider = ref("");
  const pendingPoolName = ref("");

  function setRecordContext(
    tab: Exclude<ProviderHealthTab, "status">,
    provider = "",
    poolName = ""
  ) {
    activeProvider.value = provider;
    activePoolName.value = poolName;
    pendingProvider.value = provider;
    pendingPoolName.value = poolName;
    activeTab.value = tab;
  }

  function gotoCheckRecord(provider = "", poolName = "") {
    setRecordContext("checkRecord", provider, poolName);
  }

  function gotoAlertRecord(provider = "", poolName = "") {
    setRecordContext("alertRecord", provider, poolName);
  }

  function consumeContext() {
    pendingProvider.value = "";
    pendingPoolName.value = "";
  }

  function clearProviderContext() {
    activeProvider.value = "";
    activePoolName.value = "";
    pendingProvider.value = "";
    pendingPoolName.value = "";
  }

  function showStatus() {
    clearProviderContext();
    activeTab.value = "status";
  }

  function handleTabClick() {
    clearProviderContext();
  }

  return {
    activeTab,
    activeProvider,
    activePoolName,
    pendingProvider,
    pendingPoolName,
    gotoCheckRecord,
    gotoAlertRecord,
    consumeContext,
    clearProviderContext,
    showStatus,
    handleTabClick
  };
}
