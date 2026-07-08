import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UserState {
    userId?: number;
    isAdmin?: boolean;
}

const initialState: UserState = {};

export const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        setUser: (state: UserState, action: PayloadAction<UserState>) => {
            state.userId = action.payload.userId;
            state.isAdmin = action.payload.isAdmin;
        },
    },
});

export const { setUser } = userSlice.actions;

export default userSlice.reducer;
