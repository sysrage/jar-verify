#!/bin/bash

for BLDCONFIG in ${HOME}/jar-verify/auto-verify-cfg-*.cfg; do (
  source "${BLDCONFIG}"

  JAR_BUILDDIR="/elx/local/ftpse/scm_builds/be2/Palau_${JAR_RELEASENUM}"
  JAR_WORKDIR="${HOME}/Downloads/jars/${JAR_RELEASENAME}"
  JAR_NODEBIN="${HOME}/.nvm/v4.2.4/bin/node"
  JAR_VERIFYBIN="${HOME}/jar-verify/util/jar-verify.js"

  # Create workdir if it doesn't already exist
  if [ ! -d "${JAR_WORKDIR}" ]; then
    mkdir ${JAR_WORKDIR};
  fi

  # Determine the last build which was verified
  JAR_LASTBUILDDIR=$(ls -td ${JAR_WORKDIR}/${JAR_RELEASENUM}.* | head -1)
  JAR_LASTBUILDNUM=${JAR_LASTBUILDDIR#${JAR_WORKDIR}/}
  JAR_LASTBUILDSRC="${JAR_BUILDDIR}/${JAR_LASTBUILDNUM}"
  JAR_LASTOCSABUILDLINK=$(ls -tdF ${JAR_WORKDIR}/* | grep '@' | head -1 | cut -d '@' -f 1)
  JAR_LASTOCSABUILD=${JAR_LASTOCSABUILDLINK#${JAR_WORKDIR}/}
  if [[ ${JAR_OCSADIR3} != "" ]]; then
    JAR_OCSADIR=${JAR_OCSADIR3}
    JAR_LASTOCSABUILDSRC="${JAR_OCSADIR3}/Build${JAR_LASTOCSABUILD}"
    if [[ ! -d ${JAR_LASTOCSABUILDSRC} ]]; then
      JAR_LASTOCSABUILDSRC="${JAR_OCSADIR2}/Build${JAR_LASTOCSABUILD}"
    fi
  elif [[ ${JAR_OCSADIR2} != "" ]]; then
    JAR_OCSADIR=${JAR_OCSADIR2}
    JAR_LASTOCSABUILDSRC="${JAR_OCSADIR2}/Build${JAR_LASTOCSABUILD}"
    if [[ ! -d ${JAR_LASTOCSABUILDSRC} ]]; then
      JAR_LASTOCSABUILDSRC="${JAR_OCSADIR1}/Build${JAR_LASTOCSABUILD}"
    fi
  else
    JAR_OCSADIR=${JAR_OCSADIR1}
    JAR_LASTOCSABUILDSRC="${JAR_OCSADIR1}/Build${JAR_LASTOCSABUILD}"
  fi

  # Generate list of new internally staged SCM builds
  if [[ ! ${JAR_LASTBUILDDIR} ]]; then
    JAR_NEWBUILDS=$(ls -td ${JAR_BUILDDIR}/* | head -1)
  else
    JAR_NEWBUILDS=$(find ${JAR_BUILDDIR}/* -maxdepth 0 -newer ${JAR_LASTBUILDSRC} -print)
  fi

  # Handle internally staged SCM builds
  for i in ${JAR_NEWBUILDS}; do
    JAR_BUILDNUM=${i#${JAR_BUILDDIR}/}
    if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/ReleaseNotes-${JAR_BUILDNUM}.html" ]; then
      # Build is complete
      if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/External/Palau_${JAR_BUILDNUM}_Lenovo_Package.zip" ] || [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_FW_Internal.zip" ] || [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_LNX_KIT_Internal.zip" ] || [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_WIN_Internal.zip" ]; then
        # Some JAR file packages exist
        if [ ! -d "${JAR_WORKDIR}/${JAR_BUILDNUM}/" ]; then
          # Ignore build if dir already exists - otherwise create directory
          mkdir "${JAR_WORKDIR}/${JAR_BUILDNUM}/"

          if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/External/Palau_${JAR_BUILDNUM}_Lenovo_Package.zip" ]; then
            # Lenovo package exists - unzip JAR files
            unzip -qq "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/External/Palau_${JAR_BUILDNUM}_Lenovo_Package.zip" *Red/*.jar *Red/triggerfile -d "${JAR_WORKDIR}/${JAR_BUILDNUM}/" >> jar-verify-results-${JAR_BUILDNUM}.txt

            # Move JARs to base directory and delete extras
            find "${JAR_WORKDIR}/${JAR_BUILDNUM}/${JAR_BUILDNUM}/" -name '*.jar' -exec mv {} "${JAR_WORKDIR}/${JAR_BUILDNUM}/" \;
            find "${JAR_WORKDIR}/${JAR_BUILDNUM}/${JAR_BUILDNUM}/" -name 'triggerfile' -exec mv {} "${JAR_WORKDIR}/${JAR_BUILDNUM}/" \;
            rm -rf "${JAR_WORKDIR}/${JAR_BUILDNUM}/${JAR_BUILDNUM}/"

            # Run jar-verify against new build
            ${JAR_NODEBIN} ${JAR_VERIFYBIN} -r ${JAR_RELEASENAME} -b ${JAR_BUILDNUM} >> jar-verify-results-${JAR_BUILDNUM}.txt

            # Determine if results are pass or fail
            JAR_ERRORCOUNT=$(grep 'Finished all activity with' jar-verify-results-${JAR_BUILDNUM}.txt | cut -d ' ' -f 6)
            if [[ ${JAR_ERRORCOUNT} == "0" ]]; then
              JAR_RESULTS="PASS"
            else
              JAR_RESULTS="FAIL"
            fi

            # E-mail jar-verify results
            mail -s "JAR Verification Results For ${JAR_RELEASENAME} Build ${JAR_BUILDNUM} -- ${JAR_RESULTS}" "${JAR_EMAILTO}" -- -f "${JAR_EMAILFROM}" < jar-verify-results-${JAR_BUILDNUM}.txt

            # Delete jar-verify results
            rm -f jar-verify-results-${JAR_BUILDNUM}.txt
          else
            # Unzip firmware JARs from internal package if it exists
            if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_FW_Internal.zip" ]; then
              unzip -qq "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_FW_Internal.zip" -d "${JAR_WORKDIR}/${JAR_BUILDNUM}/"
            fi

            # Unzip Linux driver JARs from internal package if it exists
            if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_LNX_KIT_Internal.zip" ]; then
              unzip -qq "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_LNX_KIT_Internal.zip" -d "${JAR_WORKDIR}/${JAR_BUILDNUM}/"
            fi

            # Unzip Windows driver JARs from internal package if it exists
            if [ -f "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_WIN_Internal.zip" ]; then
              unzip -qq "${JAR_BUILDDIR}/${JAR_BUILDNUM}/packages/Internal/Palau_${JAR_BUILDNUM}_LNVOSUPS_WIN_Internal.zip" -d "${JAR_WORKDIR}/${JAR_BUILDNUM}/"
            fi

            # Move JARs to base directory and delete extras
            find "${JAR_WORKDIR}/${JAR_BUILDNUM}/packages/" -name '*.jar' -exec mv {} "${JAR_WORKDIR}/${JAR_BUILDNUM}/" \;
            find "${JAR_WORKDIR}/${JAR_BUILDNUM}/packages/" -name 'triggerfile' -exec mv {} "${JAR_WORKDIR}/${JAR_BUILDNUM}/" \;
            rm -rf "${JAR_WORKDIR}/${JAR_BUILDNUM}/packages/"
          fi
        fi
      fi
    fi
  done

  # Delete builds older than 30 days
  find ${JAR_WORKDIR}/${JAR_RELEASENUM}.* -maxdepth 0 -mtime +30 -exec rm -rf {} \;

  # Generate list of new officially staged builds
  if [[ ! ${JAR_LASTOCSABUILD} ]]; then
    JAR_NEWOCSABUILDS=$(ls -tdF ${JAR_OCSADIR}/* | grep '@' | head -1 | cut -d '@' -f 1)
  else
    JAR_NEWOCSABUILDS=$(find ${JAR_OCSADIR}/* -maxdepth 0 -name 'Build*' -newer ${JAR_LASTOCSABUILDSRC} -print)
  fi

  # Handle officially staged builds
  for i in ${JAR_NEWOCSABUILDS}; do
    JAR_OCSABUILDNUM=${i#${JAR_OCSADIR}/Build}
    JAR_OCSABUILDVER=$(ls -la $i | cut -d '>' -f 2 | cut -d ' ' -f 2)

    # Create symlink to OCSA location
    ln -s $i/JARs/Red/ ${JAR_WORKDIR}/${JAR_OCSABUILDNUM}

    # Run jar-verify against new build and save results
    ${JAR_NODEBIN} ${JAR_VERIFYBIN} -r ${JAR_RELEASENAME} -b ${JAR_OCSABUILDNUM} -s > jar-verify-results-${JAR_OCSABUILDNUM}.txt

    # Determine if results are pass or fail
    JAR_ERRORCOUNT=$(grep 'Finished all activity with' jar-verify-results-${JAR_OCSABUILDNUM}.txt | cut -d ' ' -f 6)
    if [[ ${JAR_ERRORCOUNT} == "0" ]]; then
      JAR_RESULTS="PASS"
    else
      JAR_RESULTS="FAIL"
    fi

    # E-mail jar-verify results
    mail -s "JAR Verification Results For ${JAR_RELEASENAME} Build ${JAR_OCSABUILDNUM} (${JAR_OCSABUILDVER}) -- ${JAR_RESULTS}" "${JAR_OCSAEMAILTO}" -- -f "${JAR_EMAILFROM}" < jar-verify-results-${JAR_OCSABUILDNUM}.txt

    # Delete jar-verify results
    rm -f jar-verify-results-${JAR_OCSABUILDNUM}.txt
  done
) done