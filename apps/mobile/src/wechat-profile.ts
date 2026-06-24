export type WechatProfilePayload = {
  nickname?: string;
  avatarUrl?: string;
  authorized: boolean;
  unavailable?: boolean;
};

export function hasWechatProfilePayload(profile: WechatProfilePayload) {
  return Boolean(profile.nickname || profile.avatarUrl);
}

export function requestWechatProfile(): Promise<WechatProfilePayload> {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    const getUserProfile = (uni as any).getUserProfile;
    if (typeof getUserProfile !== "function") {
      resolve({ authorized: false, unavailable: true });
      return;
    }
    try {
      getUserProfile({
        desc: "用于完善会员昵称和头像",
        success: (res: any) => {
          const info = res?.userInfo || {};
          resolve({
            nickname: typeof info.nickName === "string" ? info.nickName : "",
            avatarUrl: typeof info.avatarUrl === "string" ? info.avatarUrl : "",
            authorized: true
          });
        },
        fail: () => resolve({ authorized: false })
      });
    } catch {
      resolve({ authorized: false, unavailable: true });
    }
    // #endif
    // #ifndef MP-WEIXIN
    resolve({ authorized: false, unavailable: true });
    // #endif
  });
}
