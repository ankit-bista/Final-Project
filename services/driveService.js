import {
  createDrive,
  createDriveActivityLog,
  assignLegacyFilesToDrive,
  findPersonalDriveByOwner,
  getDriveById,
  getDriveMember,
  incrementDriveQuotaUsed,
  listDrivesForUser,
  listDriveMembers,
  removeDriveMember,
  setDriveQuotaUsed,
  sumSizeBytesByDrive,
  updateDriveQuotaLimit,
  upsertDriveMember,
} from "./models/index.js";

export async function ensureDefaultDriveForUser(userId) {
  const existing = await findPersonalDriveByOwner(userId);
  if (existing) {
    await upsertDriveMember({ driveId: existing.id, userId, role: "admin", invitedBy: userId });
    await assignLegacyFilesToDrive(userId, existing.id);
    await recalculateDriveUsage(existing.id);
    return existing;
  }
  const drive = await createDrive({
    name: "Default",
    ownerId: userId,
    personal: true,
    quotaLimitBytes: Number.MAX_SAFE_INTEGER,
  });
  await upsertDriveMember({ driveId: drive.id, userId, role: "admin", invitedBy: userId });
  await assignLegacyFilesToDrive(userId, drive.id);
  await recalculateDriveUsage(drive.id);
  await createDriveActivityLog({
    driveId: drive.id,
    actorUserId: userId,
    action: "drive_created",
    targetType: "drive",
    targetId: drive.id,
    metadata: { personal: true },
  });
  return drive;
}

export async function requireDriveRole(driveId, userId, allowedRoles = ["viewer"]) {
  const drive = await getDriveById(driveId);
  if (!drive) {
    const err = new Error("Drive not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  const member = await getDriveMember(driveId, userId);
  const role = member?.role || (Number(drive.owner_id) === Number(userId) ? "admin" : null);
  if (!role || !allowedRoles.includes(role)) {
    const err = new Error("Drive access denied");
    err.code = "ACCESS_DENIED";
    throw err;
  }
  return { drive, role };
}

export async function assertDriveCanUpload(driveId, userId, fileSizeBytes) {
  const { drive, role } = await requireDriveRole(driveId, userId, ["admin", "editor"]);
  const size = Number(fileSizeBytes || 0);
  const used = Number(drive.quota_used_bytes || 0);
  const limit = Number(drive.quota_limit_bytes || 0);
  if (limit > 0 && used + size > limit) {
    const err = new Error("Drive quota exceeded");
    err.code = "DRIVE_QUOTA_EXCEEDED";
    throw err;
  }
  return { drive, role };
}

export async function addDriveUsage(driveId, bytesDelta) {
  await incrementDriveQuotaUsed(driveId, Number(bytesDelta || 0));
}

export async function recalculateDriveUsage(driveId) {
  const used = await sumSizeBytesByDrive(driveId);
  await setDriveQuotaUsed(driveId, used);
  return used;
}

export async function listMyDrives(userId) {
  await ensureDefaultDriveForUser(userId);
  return listDrivesForUser(userId);
}

export async function createCollaborativeDrive({ ownerId, name, quotaLimitBytes }) {
  const drive = await createDrive({
    name: String(name || "Shared Drive"),
    ownerId,
    personal: false,
    quotaLimitBytes: Number(quotaLimitBytes || 0),
  });
  await upsertDriveMember({ driveId: drive.id, userId: ownerId, role: "admin", invitedBy: ownerId });
  await createDriveActivityLog({
    driveId: drive.id,
    actorUserId: ownerId,
    action: "drive_created",
    targetType: "drive",
    targetId: drive.id,
    metadata: { personal: false },
  });
  return drive;
}

export async function inviteDriveMember({ driveId, actorUserId, targetUserId, role }) {
  await requireDriveRole(driveId, actorUserId, ["admin"]);
  const member = await upsertDriveMember({
    driveId,
    userId: targetUserId,
    role: role === "admin" || role === "editor" ? role : "viewer",
    invitedBy: actorUserId,
  });
  await createDriveActivityLog({
    driveId,
    actorUserId,
    action: "member_invited",
    targetType: "member",
    targetId: targetUserId,
    metadata: { role: member.role },
  });
  return member;
}

export async function removeDriveMemberByAdmin({ driveId, actorUserId, targetUserId }) {
  await requireDriveRole(driveId, actorUserId, ["admin"]);
  const ok = await removeDriveMember(driveId, targetUserId);
  if (ok) {
    await createDriveActivityLog({
      driveId,
      actorUserId,
      action: "member_removed",
      targetType: "member",
      targetId: targetUserId,
    });
  }
  return ok;
}

export async function updateDriveQuotaByAdmin({ driveId, actorUserId, quotaLimitBytes }) {
  await requireDriveRole(driveId, actorUserId, ["admin"]);
  await updateDriveQuotaLimit(driveId, quotaLimitBytes);
  await createDriveActivityLog({
    driveId,
    actorUserId,
    action: "quota_updated",
    targetType: "drive",
    targetId: driveId,
    metadata: { quotaLimitBytes: Number(quotaLimitBytes || 0) },
  });
}

export async function getDriveMembersByUser(driveId, userId) {
  await requireDriveRole(driveId, userId, ["admin", "editor", "viewer"]);
  return listDriveMembers(driveId);
}
