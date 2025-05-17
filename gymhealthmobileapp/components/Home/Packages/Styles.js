import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerSection: {
    padding: 10,
  },
  header: {
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  headerTitle: {
    fontWeight: "bold",
  },
  searchBar: {
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: "#e0e0ff",
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 20,
    overflow: "hidden",
  },
  cardImage: {
    height: 180,
  },
  cardContent: {
    padding: 10,
  },
  typeChipContainer: {
    position: "absolute",
    top: -20,
    right: 10,
    zIndex: 1,
  },
  typeChip: {
    backgroundColor: "#fff",
  },
  title: {
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  priceMonth: {
    fontSize: 16,
    color: "#666",
  },
  priceTotal: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#EF6C00",
  },
  sessions: {
    fontSize: 16,
    fontWeight: "500",
  },
  cardActions: {
    justifyContent: "center",
    paddingVertical: 10,
    flexDirection: "row",
  },
  btn: {
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 200,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 25,
    paddingHorizontal: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  emptyText: {
    color: "#666",
  },

  /* Thêm styles cho phần hiển thị gói tập hiện tại */
  packageCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginVertical: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  packageName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a73e8",
    marginBottom: 12,
  },
  packageDetails: {
    marginBottom: 15,
  },
  packageDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 16,
    color: "#666",
    flexDirection: "row",
    alignItems: "center",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  packageBenefits: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    fontStyle: "italic",
  },

  // Chuẩn hóa các button styles
  actionButton: {
    height: 44,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    minWidth: 120,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: "#1a73e8",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  outlineButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#1a73e8",
  },
  outlineButtonText: {
    color: "#1a73e8",
    fontSize: 16,
    fontWeight: "600",
  },
  actionButtonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
  },

  sectionHeader: {
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  errorText: {
    color: "#e53935",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },

  // Styles cho SubscriptionHistory component
  historyContainer: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  subscriptionItem: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: "relative",
    paddingTop: 24,
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 1,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  // Không còn cần thiết vì tất cả các item giờ đều có cùng kiểu dáng
  // activePackageCard: {
  //     borderWidth: 2,
  //     borderColor: "#4CAF50",
  //     position: "relative",
  //     paddingTop: 24,
  // },
  activePackageBadge: {
    position: "absolute",
    top: -12,
    right: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    elevation: 3,
    zIndex: 1,
  },
  activePackageBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 5,
  },
  paginationButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  paginationButtonDisabled: {
    backgroundColor: "#ccc",
  },
  paginationButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  paginationInfo: {
    color: "#666",
    fontSize: 15,
    fontWeight: "500",
  },
  loadingMoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
  },
  loadingMoreText: {
    marginLeft: 8,
    color: "#666",
    fontSize: 15,
  },
  viewHistoryButton: {
    backgroundColor: "#f1f8ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d0e1fd",
  },
  viewHistoryButtonText: {
    color: "#1a73e8",
    fontSize: 14,
    fontWeight: "500",
  },
  noPackageContainer: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginVertical: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: "#1a73e8",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    flexDirection: "row",
  },
  buttonOutlineText: {
    color: "#1a73e8",
    fontSize: 16,
    fontWeight: "600",
  },
  noPackageText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  registerPackageButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    elevation: 2,
  },
  registerPackageButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
