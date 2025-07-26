// src/components/ProfileSettings.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase'; // Import db here for getDoc
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // For fetching initial Firestore profile data
import {
  updateUserProfileName,
  updateUserProfilePicture,
  updateUserOnlineStatus
} from '@/lib/profile'; // Import profile management functions
import { Loader2 } from 'lucide-react';

const APP_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID; // Consistent APP_ID

const ProfileSettings: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [onlineStatus, setOnlineStatus] = useState<'online' | 'offline' | 'away'>('offline');

  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const { toast } = useToast();

  // Listen for auth state changes to get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setProfileName(user.displayName || user.email || '');
        setProfilePictureUrl(user.photoURL || '');
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch additional profile data from Firestore (like online status)
  useEffect(() => {
    const fetchFirestoreProfile = async () => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, `users/${currentUser.uid}`);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setOnlineStatus(data.onlineStatus || 'offline');
            // Ensure display name from Auth takes precedence if set, otherwise use Firestore name
            if (!currentUser.displayName && data.name) {
              setProfileName(data.name);
            }
            if (!currentUser.photoURL && data.profilePictureUrl) {
              setProfilePictureUrl(data.profilePictureUrl);
            }
          }
        } catch (error) {
          console.error("Error fetching Firestore profile:", error);
          toast({
            title: "Error",
            description: "Failed to load profile data.",
            variant: "destructive",
          });
        }
      }
    };

    fetchFirestoreProfile();
  }, [currentUser, toast]);


  const handleSaveName = async () => {
    if (!currentUser || !profileName.trim()) return;
    setIsSavingName(true);
    try {
      await updateUserProfileName(currentUser.uid, profileName.trim());
      toast({
        title: "Success!",
        description: "Profile name updated.",
        variant: "success",
      });
    } catch (error: any) {
      console.error("Error saving name:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile name.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) return;
    const file = event.target.files?.[0];
    if (file) {
      setIsUploadingPicture(true);
      try {
        const newPhotoURL = await updateUserProfilePicture(currentUser.uid, file);
        setProfilePictureUrl(newPhotoURL);
        toast({
          title: "Success!",
          description: "Profile picture updated.",
          variant: "success",
        });
      } catch (error: any) {
        console.error("Error uploading picture:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to upload profile picture.",
          variant: "destructive",
        });
      } finally {
        setIsUploadingPicture(false);
      }
    }
  };

  const handleStatusChange = async (value: string) => {
    if (!currentUser) return;
    const newStatus = value as 'online' | 'offline' | 'away';
    setIsUpdatingStatus(true);
    try {
      await updateUserOnlineStatus(currentUser.uid, newStatus);
      setOnlineStatus(newStatus);
      toast({
        title: "Success!",
        description: "Online status updated.",
        variant: "success",
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update online status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <h2 className="text-xl font-semibold">Please log in to manage your profile.</h2>
        <p className="text-muted-foreground mt-2">Only authenticated users can access profile settings.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Profile Settings</h1>

      <Card className="p-6 mb-6 shadow-card">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
          <CardDescription>Update your public profile details.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profilePictureUrl} alt={profileName || "User"} />
              <AvatarFallback>{profileName.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="profile-picture-upload" className="cursor-pointer text-sm text-primary hover:underline">
                Change Profile Picture
              </Label>
              <Input
                id="profile-picture-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePictureChange}
                disabled={isUploadingPicture}
              />
              {isUploadingPicture && (
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-name">Display Name</Label>
            <div className="flex space-x-2">
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                disabled={isSavingName}
              />
              <Button onClick={handleSaveName} disabled={isSavingName || !profileName.trim()}>
                {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={currentUser.email || ''} disabled readOnly />
            <CardDescription className="text-xs">Email cannot be changed here.</CardDescription>
          </div>
        </CardContent>
      </Card>

      <Card className="p-6 shadow-card">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-lg font-semibold">Online Status</CardTitle>
          <CardDescription>Let others know your availability.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <RadioGroup
            value={onlineStatus}
            onValueChange={handleStatusChange}
            className="flex space-x-4"
            disabled={isUpdatingStatus}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="online" id="status-online" />
              <Label htmlFor="status-online">Online</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="offline" id="status-offline" />
              <Label htmlFor="status-offline">Offline</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="away" id="status-away" />
              <Label htmlFor="status-away">Away</Label>
            </div>
          </RadioGroup>
          {isUpdatingStatus && (
             <div className="flex items-center mt-2 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating status...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;